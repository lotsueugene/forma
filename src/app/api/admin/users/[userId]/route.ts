import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/admin-auth';

// GET /api/admin/users/[userId] - Get user details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        workspaceMembers: {
          select: {
            role: true,
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
                subscription: {
                  select: { plan: true },
                },
                _count: {
                  select: { forms: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Admin user detail error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users/[userId] - Update user (role, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    const body = await request.json();
    const { role } = body;

    // Validate role
    if (role && !['user', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Prevent demoting yourself
    if (userId === admin.user.id && role === 'user') {
      return NextResponse.json(
        { error: 'Cannot demote yourself' },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(role && { role }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Admin user update error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[userId] - Delete user and all their data
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

    // Prevent deleting yourself
    if (userId === admin.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete yourself' },
        { status: 400 }
      );
    }

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
        // Delete form submissions first (no cascade from Form)
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
    console.error('Admin user delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
