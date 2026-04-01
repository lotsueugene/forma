import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyWorkspaceAccess } from '@/lib/workspace-auth';
import { sendInvitationEmail } from '@/lib/email';

// DELETE /api/workspaces/[id]/invitations/[invitationId] - Cancel invitation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; invitationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, invitationId } = await params;
    const access = await verifyWorkspaceAccess(session.user.id, id, 'manager');

    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.workspaceId !== id) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    await prisma.invitation.delete({
      where: { id: invitationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error canceling invitation:', error);
    return NextResponse.json(
      { error: 'Failed to cancel invitation' },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/[id]/invitations/[invitationId] - Resend invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; invitationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, invitationId } = await params;
    const access = await verifyWorkspaceAccess(session.user.id, id, 'manager');

    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.workspaceId !== id) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Update expiration and regenerate token
    const updatedInvitation = await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      include: {
        invitedBy: {
          select: { id: true, name: true, email: true },
        },
        workspace: {
          select: { name: true },
        },
      },
    });

    // Send invitation email (non-blocking)
    sendInvitationEmail({
      token: updatedInvitation.token,
      email: updatedInvitation.email,
      role: updatedInvitation.role,
      workspaceName: updatedInvitation.workspace.name,
      invitedByName: updatedInvitation.invitedBy.name || updatedInvitation.invitedBy.email || 'A team member',
      expiresAt: updatedInvitation.expiresAt,
    }).catch((err) => {
      console.error('Failed to resend invitation email:', err);
    });

    return NextResponse.json({
      invitation: {
        id: updatedInvitation.id,
        email: updatedInvitation.email,
        role: updatedInvitation.role,
        expiresAt: updatedInvitation.expiresAt,
        createdAt: updatedInvitation.createdAt,
        invitedBy: updatedInvitation.invitedBy,
      },
    });
  } catch (error) {
    console.error('Error resending invitation:', error);
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    );
  }
}
