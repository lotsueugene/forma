import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyWorkspaceAccess } from '@/lib/workspace-auth';

// GET /api/workspaces/[id]/members - List workspace members
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
    const access = await verifyWorkspaceAccess(session.user.id, id);

    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' }, // owner first
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        role: m.role,
        createdAt: m.createdAt,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image,
      })),
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}
