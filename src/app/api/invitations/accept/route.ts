import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/invitations/accept - Accept invitation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      );
    }

    // Find the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        workspace: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or has been canceled' },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      );
    }

    // Check if invitation is for this user's email
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invitation was sent to a different email address' },
        { status: 403 }
      );
    }

    // Check if already a member
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: invitation.workspaceId,
          userId: session.user.id,
        },
      },
    });

    if (existingMember) {
      // Delete the invitation since user is already a member
      await prisma.invitation.delete({
        where: { id: invitation.id },
      });

      return NextResponse.json(
        { error: 'You are already a member of this workspace' },
        { status: 400 }
      );
    }

    // Create membership and delete invitation in a transaction
    const [member] = await prisma.$transaction([
      prisma.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId: session.user.id,
          role: invitation.role,
        },
        include: {
          workspace: true,
        },
      }),
      prisma.invitation.delete({
        where: { id: invitation.id },
      }),
    ]);

    return NextResponse.json({
      workspace: {
        id: member.workspace.id,
        name: member.workspace.name,
        slug: member.workspace.slug,
        role: member.role,
      },
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}
