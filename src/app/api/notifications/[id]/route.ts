import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/notifications/[id] - mark a notification read/unread
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      read?: boolean;
      displayed?: boolean;
    };
    const data: { readAt?: Date | null; displayedAt?: Date | null } = {};
    if (typeof body.read === 'boolean') {
      data.readAt = body.read ? new Date() : null;
    }
    if (typeof body.displayed === 'boolean') {
      data.displayedAt = body.displayed ? new Date() : null;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No notification update provided' }, { status: 400 });
    }

    const updated = await prisma.notification.updateMany({
      where: { id, userId: session.user.id, deletedAt: null },
      data,
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/notifications/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/[id] - soft delete a notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const updated = await prisma.notification.updateMany({
      where: { id, userId: session.user.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/notifications/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
