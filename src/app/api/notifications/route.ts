import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { DashboardNotification, NotificationsListResponse } from '@/types/notifications';

/**
 * GET /api/notifications
 *
 * Swap the empty list below for real data when you add notifications:
 *
 * 1. prisma/schema.prisma — model Notification { id, userId, type, title, body, href, read, createdAt }
 * 2. Create rows when events happen (new submission — webhook/worker, mention, billing, etc.)
 * 3. Replace the return with:
 *    const rows = await prisma.notification.findMany({
 *      where: { userId: session.user.id },
 *      orderBy: { createdAt: 'desc' },
 *      take: 30,
 *    });
 *    return NextResponse.json({
 *      notifications: rows.map((n) => ({ ... } satisfies DashboardNotification)),
 *    });
 *
 * Optional: PATCH /api/notifications/[id] or POST /api/notifications/mark-read for read state.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      // Return an empty payload instead of hard-failing the UI.
      // The dashboard already protects most pages behind auth, but this keeps
      // the notifications UI resilient if session cookies aren't available.
      const payload: NotificationsListResponse = {
        notifications: [],
        nextCursor: null,
        unreadCount: 0,
      };
      return NextResponse.json(payload);
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limitRaw = searchParams.get('limit');
    const workspaceId = searchParams.get('workspaceId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const limit = Math.min(50, Math.max(1, Number(limitRaw || 30) || 30));

    const where = {
      userId: session.user.id,
      deletedAt: null as null,
      ...(workspaceId ? { workspaceId } : {}),
      ...(unreadOnly ? { readAt: null as null } : {}),
    };

    const [unreadCount, rows] = await Promise.all([
      prisma.notification.count({
        where: {
          userId: session.user.id,
          deletedAt: null,
          readAt: null,
          ...(workspaceId ? { workspaceId } : {}),
        },
      }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1,
            }
          : {}),
      }),
    ]);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1]!.id : null;

    const notifications: DashboardNotification[] = page.map((n) => ({
      id: n.id,
      type: n.type,
      workspaceId: n.workspaceId,
      title: n.title,
      body: n.body,
      href: n.href,
      read: n.readAt != null,
      createdAt: n.createdAt.toISOString(),
    }));

    const payload: NotificationsListResponse = {
      notifications,
      nextCursor,
      unreadCount,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error('GET /api/notifications:', error);
    return NextResponse.json(
      { error: 'Failed to load notifications' },
      { status: 500 }
    );
  }
}

// POST /api/notifications/mark-read (mark all as read)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { ids?: string[]; workspaceId?: string };
    const ids = Array.isArray(body.ids) ? body.ids : null;
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : null;

    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        ...(workspaceId ? { workspaceId } : {}),
        ...(ids ? { id: { in: ids } } : {}),
        readAt: null,
        deletedAt: null,
      },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/notifications:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications read' },
      { status: 500 }
    );
  }
}
