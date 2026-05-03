import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

// DELETE /api/user/account - Delete own account and all data
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Find all workspaces where this user is the owner
    const ownedWorkspaces = await prisma.workspaceMember.findMany({
      where: {
        userId,
        role: 'owner',
      },
      select: {
        workspaceId: true,
      },
    });

    const workspaceIds = ownedWorkspaces.map((w) => w.workspaceId);

    // ── Cancel any active Stripe subscription BEFORE deleting the
    // database rows. Without this, the local Subscription.userId gets
    // SetNull-cascaded on user.delete() but Stripe is never notified,
    // so the user keeps getting charged every billing cycle even
    // though they no longer have an account or any way to log in.
    //
    // We also delete the Stripe customer record(s) so Stripe stops
    // storing the user's payment method / email (GDPR-friendly).
    // Past invoices and charges remain available for refunds because
    // those live on the charge/invoice objects, not on the customer.
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
        // Cancel subscriptions immediately (no end-of-period). The user
        // is deleting their account right now; charging them through
        // the rest of the billing period would be wrong.
        for (const subId of subscriptionIdsToCancel) {
          await stripe.subscriptions.cancel(subId).catch((err) => {
            // 404 = already canceled / never existed in this Stripe
            // account (e.g. test-mode leftover) — safe to ignore.
            if ((err as { statusCode?: number }).statusCode !== 404) throw err;
          });
        }
        // Delete customers so payment method / contact info is purged
        // from Stripe. Refunds against existing charges still work.
        for (const custId of customerIdsToDelete) {
          await stripe.customers.del(custId).catch((err) => {
            if ((err as { statusCode?: number }).statusCode !== 404) throw err;
          });
        }
      } catch (err) {
        // Hard-fail the deletion if Stripe cleanup didn't succeed —
        // we'd rather leave the account intact than strand a paying
        // customer with no UI to cancel from. The user can retry.
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

    // Delete in transaction to ensure data integrity
    await prisma.$transaction(async (tx) => {
      // Mark the local Subscription row as canceled. The row stays
      // (for MRR history) but its userId/workspaceId will be
      // SetNull-cascaded below, so without this it would show as
      // "active" forever in queries that look at status.
      const orphanedSubIds = Array.from(subscriptionIdsToCancel);
      if (orphanedSubIds.length > 0) {
        await tx.subscription.updateMany({
          where: { stripeSubscriptionId: { in: orphanedSubIds } },
          data: { status: 'canceled', plan: 'free' },
        });
      }

      // For each owned workspace, delete everything related
      if (workspaceIds.length > 0) {
        // Delete form submissions first
        await tx.submission.deleteMany({
          where: {
            form: {
              workspaceId: { in: workspaceIds },
            },
          },
        });

        // Delete forms
        await tx.form.deleteMany({
          where: { workspaceId: { in: workspaceIds } },
        });

        // The Subscription row itself is preserved for historical MRR
        // reporting (its userId/workspaceId get SetNull-cascaded). The
        // matching Stripe subscription was already canceled above, so
        // no further charges will occur.

        // Delete usage records
        await tx.usageRecord.deleteMany({
          where: { workspaceId: { in: workspaceIds } },
        });

        // Delete integrations
        await tx.integration.deleteMany({
          where: { workspaceId: { in: workspaceIds } },
        });

        // Delete API keys
        await tx.apiKey.deleteMany({
          where: { workspaceId: { in: workspaceIds } },
        });

        // Delete invitations
        await tx.invitation.deleteMany({
          where: { workspaceId: { in: workspaceIds } },
        });

        // Delete workspace members (including other members)
        await tx.workspaceMember.deleteMany({
          where: { workspaceId: { in: workspaceIds } },
        });

        // Delete webhook endpoints
        await tx.webhookEndpoint.deleteMany({
          where: { workspaceId: { in: workspaceIds } },
        });

        // Delete custom domains
        await tx.customDomain.deleteMany({
          where: { workspaceId: { in: workspaceIds } },
        });

        // Delete notifications for workspaces
        await tx.notification.deleteMany({
          where: { workspaceId: { in: workspaceIds } },
        });

        // Finally delete the workspaces
        await tx.workspace.deleteMany({
          where: { id: { in: workspaceIds } },
        });
      }

      // Delete user (cascades to remaining relations like sessions, accounts)
      await tx.user.delete({
        where: { id: userId },
      });
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
