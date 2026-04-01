import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyWorkspaceAccess } from '@/lib/workspace-auth';
import { checkLimit } from '@/lib/subscription';
import { publishToUser } from '@/lib/notifications/pubsub';
import { sendInvitationEmail } from '@/lib/email';

// GET /api/workspaces/[id]/invitations - List pending invitations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const access = await verifyWorkspaceAccess(session.user.id, id, 'manager');

    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        workspaceId: id,
        expiresAt: { gt: new Date() },
      },
      include: {
        invitedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      invitations: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        invitedBy: inv.invitedBy,
      })),
    });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/[id]/invitations - Send invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const access = await verifyWorkspaceAccess(session.user.id, id, 'manager');

    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    // Check subscription allows inviting members
    const limitCheck = await checkLimit(id, 'inviteMember');
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.reason || 'Team member limit reached. Upgrade to invite more members.' },
        { status: 402 }
      );
    }

    const { email, role } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!['manager', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be manager, editor, or viewer.' },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: id,
            userId: existingUser.id,
          },
        },
      });

      if (existingMember) {
        return NextResponse.json(
          { error: 'User is already a member of this workspace' },
          { status: 400 }
        );
      }
    }

    // Delete any existing invitation for this email
    await prisma.invitation.deleteMany({
      where: {
        workspaceId: id,
        email: email.toLowerCase(),
      },
    });

    // Create new invitation (expires in 7 days)
    const invitation = await prisma.invitation.create({
      data: {
        email: email.toLowerCase(),
        role,
        workspaceId: id,
        invitedById: session.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      include: {
        invitedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Fetch workspace for email
    const workspace = await prisma.workspace.findUnique({
      where: { id },
      select: { name: true },
    });

    // Send invitation email (non-blocking)
    sendInvitationEmail({
      token: invitation.token,
      email: invitation.email,
      role: invitation.role,
      workspaceName: workspace?.name || 'Workspace',
      invitedByName: invitation.invitedBy.name || invitation.invitedBy.email || 'A team member',
      expiresAt: invitation.expiresAt,
    }).catch((err) => {
      console.error('Failed to send invitation email:', err);
    });

    // In-app notifications for workspace admins/owners
    try {
      const recipients = await prisma.workspaceMember.findMany({
        where: {
          workspaceId: id,
          role: { in: ['owner', 'manager'] },
        },
        select: {
          userId: true,
          user: {
            select: {
              settings: { select: { notifyTeamInvites: true } },
            },
          },
        },
      });

      const recipientIds = recipients
        .filter((m) => m.user.settings?.notifyTeamInvites !== false)
        .map((m) => m.userId);

      if (recipientIds.length > 0) {
        await prisma.notification.createMany({
          data: recipientIds.map((userId) => ({
            userId,
            workspaceId: id,
            type: 'invite',
            title: 'Team invite sent',
            body: `${invitation.email} · ${invitation.role}`,
            href: '/dashboard/team',
          })),
        });

        for (const userId of recipientIds) {
          publishToUser(userId, { type: 'invite', workspaceId: id });
        }
      }
    } catch (notifyErr) {
      console.error('Error creating invite notifications:', notifyErr);
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
        invitedBy: invitation.invitedBy,
      },
    });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}
