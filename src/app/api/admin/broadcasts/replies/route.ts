import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/admin-auth';

// GET /api/admin/broadcasts/replies - List all replies
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // unread, read, replied, or all
    const broadcastId = searchParams.get('broadcastId');

    const replies = await prisma.broadcastReply.findMany({
      where: {
        ...(status && status !== 'all' ? { status } : {}),
        ...(broadcastId ? { broadcastId } : {}),
      },
      include: {
        broadcast: {
          select: {
            id: true,
            subject: true,
          },
        },
      },
      orderBy: { receivedAt: 'desc' },
    });

    // Get unread count
    const unreadCount = await prisma.broadcastReply.count({
      where: { status: 'unread' },
    });

    return NextResponse.json({ replies, unreadCount });
  } catch (error) {
    console.error('Admin replies error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch replies' },
      { status: 500 }
    );
  }
}
