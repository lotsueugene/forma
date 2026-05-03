import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const ownedWorkspaces = await prisma.workspaceMember.findMany({
      where: { userId, role: 'owner' },
      select: { workspaceId: true },
    });

    const workspaceIds = ownedWorkspaces.map((w) => w.workspaceId);

    const userSub = await prisma.subscription.findUnique({
      where: { userId },
      select: { stripeSubscriptionId: true, status: true },
    });

    const ownedWorkspacesFull = workspaceIds.length
      ? await prisma.workspace.findMany({
          where: { id: { in: workspaceIds } },
          select: { id: true, stripeCustomerId: true, subscription: { select: { stripeSubscriptionId: true, status: true } } },
        })
      : [];

    const subscriptionIdsToCancel = new Set<string>();
    if (userSub?.stripeSubscriptionId && userSub.status !== 'canceled') {
      subscriptionIdsToCancel.add(userSub.stripeSubscriptionId);
    }
    for (const ws of ownedWorkspacesFull) {
      const sid = ws.subscription?.stripeSubscriptionId;
      if (sid && ws.subscription?.status !== 'canceled') {
        subscriptionIdsToCancel.add(sid);
      }
    }

    const customerIdsToDelete = new Set<string>();
    for (const ws of ownedWorkspacesFull) {
      if (ws.stripeCustomerId) customerIdsToDelete.add(ws.stripeCustomerId);
    }

    if (stripe && (subscriptionIdsToCancel.size > 0 || customerIdsToDelete.size > 0)) {
      try {
        for (const subId of subscriptionIdsToCancel) {
          await stripe.subscriptions.cancel(subId).catch((err) => {
            if ((err as { statusCode?: number }).statusCode !== 404) throw err;
          });
        }
        for (const custId of customerIdsToDelete) {
          await stripe.customers.del(custId).catch((err) => {
            if ((err as { statusCode?: number }).statusCode !== 404) throw err;
          });
        }
      } catch (err) {
        // Bail before DB delete so we don't strand a paying customer with no UI to cancel from.
        console.error('Stripe cleanup before account deletion failed:', err);
        return NextResponse.json(
          {
            error:
              'We could not cancel your subscription with our payment provider. Your account was not deleted. Please try again or contact support so we can help cancel manually.',
          },
          { status: 502 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      const orphanedSubIds = Array.from(subscriptionIdsToCancel);
      if (orphanedSubIds.length > 0) {
        await tx.subscription.updateMany({
          where: { stripeSubscriptionId: { in: orphanedSubIds } },
          data: { status: 'canceled', plan: 'free' },
        });
      }

      if (workspaceIds.length > 0) {
        await tx.submission.deleteMany({
          where: { form: { workspaceId: { in: workspaceIds } } },
        });
        await tx.form.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
        await tx.usageRecord.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
        await tx.integration.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
        await tx.apiKey.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
        await tx.invitation.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
        await tx.workspaceMember.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
        await tx.webhookEndpoint.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
        await tx.customDomain.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
        await tx.notification.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
        await tx.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
      }

      await tx.user.delete({ where: { id: userId } });
    });

    const { auditLog } = await import('@/lib/audit');
    auditLog({
      action: 'auth.account_delete',
      userId,
      details: {
        email: session.user.email,
        canceledStripeSubscriptions: Array.from(subscriptionIdsToCancel),
        deletedStripeCustomers: Array.from(customerIdsToDelete),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
