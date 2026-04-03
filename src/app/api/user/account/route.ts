import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // Delete in transaction to ensure data integrity
    await prisma.$transaction(async (tx) => {
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

        // Delete subscriptions
        await tx.subscription.deleteMany({
          where: { workspaceId: { in: workspaceIds } },
        });

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
