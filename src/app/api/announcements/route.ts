import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/announcements - Get active announcements for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const now = new Date();

    // Get active announcements
    const announcements = await prisma.announcement.findMany({
      where: {
        startsAt: { lte: now },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // If user is logged in, filter out dismissed announcements
    let dismissedIds: string[] = [];
    if (userId) {
      const dismissed = await prisma.announcementDismissal.findMany({
        where: { userId },
        select: { announcementId: true },
      });
      dismissedIds = dismissed.map(d => d.announcementId);
    }

    const activeAnnouncements = announcements
      .filter(a => !dismissedIds.includes(a.id))
      .map(a => ({
        id: a.id,
        title: a.title,
        content: a.content,
        type: a.type,
        dismissible: a.dismissible,
        showBanner: a.showBanner,
        showModal: a.showModal,
      }));

    return NextResponse.json({ announcements: activeAnnouncements });
  } catch (error) {
    console.error('Announcements error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch announcements' },
      { status: 500 }
    );
  }
}

// POST /api/announcements - Dismiss an announcement
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { announcementId } = body;

    if (!announcementId) {
      return NextResponse.json(
        { error: 'Announcement ID is required' },
        { status: 400 }
      );
    }

    // Check if announcement exists and is dismissible
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      );
    }

    if (!announcement.dismissible) {
      return NextResponse.json(
        { error: 'This announcement cannot be dismissed' },
        { status: 400 }
      );
    }

    // Create dismissal record
    await prisma.announcementDismissal.upsert({
      where: {
        announcementId_userId: {
          announcementId,
          userId: session.user.id,
        },
      },
      update: {},
      create: {
        announcementId,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Dismiss announcement error:', error);
    return NextResponse.json(
      { error: 'Failed to dismiss announcement' },
      { status: 500 }
    );
  }
}
