import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyWorkspaceAccess } from '@/lib/workspace-auth';
import { downgradeToFreePlan } from '@/lib/subscription';
import { stripe } from '@/lib/stripe';

// PUT /api/workspaces/[id]/members/[memberId] - Update member role or transfer ownership
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, memberId } = await params;
    const { role, action } = await request.json();

    // Transfer ownership
    if (action === 'transfer_ownership') {
      const access = await verifyWorkspaceAccess(session.user.id, id, 'owner');
      if (!access.allowed) {
        return NextResponse.json({ error: 'Only the owner can transfer ownership' }, { status: 403 });
      }

      const targetMember = await prisma.workspaceMember.findUnique({
        where: { id: memberId },
      });

      if (!targetMember || targetMember.workspaceId !== id) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      if (targetMember.userId === session.user.id) {
        return NextResponse.json({ error: 'Cannot transfer ownership to yourself' }, { status: 400 });
      }

      // Swap roles in a transaction
      await prisma.$transaction([
        prisma.workspaceMember.update({
          where: { id: memberId },
          data: { role: 'owner' },
        }),
        prisma.workspaceMember.update({
          where: { id: access.membership!.id },
          data: { role: 'manager' },
        }),
      ]);

      // Cancel Stripe subscription and downgrade to free
      const subscription = await prisma.subscription.findUnique({
        where: { workspaceId: id },
      });

      if (subscription?.stripeSubscriptionId && stripe) {
        try {
          await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
        } catch (err) {
          console.error('Failed to cancel Stripe subscription on ownership transfer:', err);
        }
      }

      await downgradeToFreePlan(id);

      return NextResponse.json({ success: true, message: 'Ownership transferred. Workspace downgraded to free plan.' });
    }

    // Regular role update
    const access = await verifyWorkspaceAccess(session.user.id, id, 'manager');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    if (!['manager', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be manager, editor, or viewer.' },
        { status: 400 }
      );
    }

    const targetMember = await prisma.workspaceMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.workspaceId !== id) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Cannot change owner's role (use transfer instead)
    if (targetMember.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot change owner role. Use transfer ownership instead.' },
        { status: 400 }
      );
    }

    // Only owner can change manager roles
    if (targetMember.role === 'manager' && access.membership?.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owner can change manager roles' },
        { status: 403 }
      );
    }

    const member = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json({ member });
  } catch (error) {
    console.error('Error updating member:', error);
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    );
  }
}

// DELETE /api/workspaces/[id]/members/[memberId] - Remove member or leave workspace
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, memberId } = await params;

    // Get the target member
    const targetMember = await prisma.workspaceMember.findUnique({
      where: { id: memberId },
      include: { user: { select: { id: true } } },
    });

    if (!targetMember || targetMember.workspaceId !== id) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const isSelf = targetMember.userId === session.user.id;

    // Owner leaving the workspace
    if (targetMember.role === 'owner') {
      if (!isSelf) {
        return NextResponse.json({ error: 'Cannot remove workspace owner' }, { status: 400 });
      }

      // Check if this is a personal workspace
      const workspace = await prisma.workspace.findUnique({
        where: { id },
        select: { isPersonal: true },
      });

      if (workspace?.isPersonal) {
        return NextResponse.json({ error: 'Cannot leave your personal workspace' }, { status: 400 });
      }

      // Find the next member to transfer ownership to (prefer managers, then editors)
      const nextOwner = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: id,
          userId: { not: session.user.id },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (!nextOwner) {
        return NextResponse.json(
          { error: 'Cannot leave — you are the only member. Delete the workspace instead.' },
          { status: 400 }
        );
      }

      // Transfer ownership to next member and remove self
      await prisma.$transaction([
        prisma.workspaceMember.update({
          where: { id: nextOwner.id },
          data: { role: 'owner' },
        }),
        prisma.workspaceMember.delete({
          where: { id: memberId },
        }),
      ]);

      // Cancel Stripe subscription and downgrade to free
      const subscription = await prisma.subscription.findUnique({
        where: { workspaceId: id },
      });

      if (subscription?.stripeSubscriptionId && stripe) {
        try {
          await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
        } catch (err) {
          console.error('Failed to cancel Stripe subscription on owner leave:', err);
        }
      }

      await downgradeToFreePlan(id);

      return NextResponse.json({
        success: true,
        message: 'You have left the workspace. Ownership was transferred. Workspace downgraded to free plan.',
        newOwnerId: nextOwner.userId,
      });
    }

    // Non-owner: either leaving self or being removed by manager/owner
    if (isSelf) {
      // Member leaving voluntarily
      await prisma.workspaceMember.delete({ where: { id: memberId } });
      return NextResponse.json({ success: true });
    }

    // Being removed by someone else — need manager+ access
    const access = await verifyWorkspaceAccess(session.user.id, id, 'manager');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    // Only owner can remove managers
    if (targetMember.role === 'manager' && access.membership?.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owner can remove managers' },
        { status: 403 }
      );
    }

    await prisma.workspaceMember.delete({ where: { id: memberId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
