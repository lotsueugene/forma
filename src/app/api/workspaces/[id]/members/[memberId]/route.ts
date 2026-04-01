import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyWorkspaceAccess } from '@/lib/workspace-auth';

// PUT /api/workspaces/[id]/members/[memberId] - Update member role
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
    const access = await verifyWorkspaceAccess(session.user.id, id, 'admin');

    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { role } = await request.json();

    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, editor, or viewer.' },
        { status: 400 }
      );
    }

    // Get the target member
    const targetMember = await prisma.workspaceMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.workspaceId !== id) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Cannot change owner's role
    if (targetMember.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot change owner role' },
        { status: 400 }
      );
    }

    // Only owner can change admin roles
    if (targetMember.role === 'admin' && access.membership?.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owner can change admin roles' },
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

// DELETE /api/workspaces/[id]/members/[memberId] - Remove member
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
    const access = await verifyWorkspaceAccess(session.user.id, id, 'admin');

    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    // Get the target member
    const targetMember = await prisma.workspaceMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.workspaceId !== id) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Cannot remove owner
    if (targetMember.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot remove workspace owner' },
        { status: 400 }
      );
    }

    // Only owner can remove admins
    if (targetMember.role === 'admin' && access.membership?.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owner can remove admins' },
        { status: 403 }
      );
    }

    await prisma.workspaceMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
