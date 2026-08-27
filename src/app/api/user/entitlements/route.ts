import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getEntitlementSummary } from '@/lib/entitlements';

function formatNotification(row: {
  id: string;
  type: string;
  entitlementId: string | null;
  title: string;
  body: string | null;
  createdAt: Date;
  entitlement: {
    id: string;
    startsAt: Date;
    expiresAt: Date | null;
    source: string;
    grantReason: string;
  } | null;
}) {
  return {
    id: row.id,
    type: row.type,
    entitlementId: row.entitlementId,
    title: row.title,
    message: row.body,
    createdAt: row.createdAt.toISOString(),
    entitlement: row.entitlement
      ? {
          id: row.entitlement.id,
          startsAt: row.entitlement.startsAt.toISOString(),
          expiresAt: row.entitlement.expiresAt?.toISOString() ?? null,
          source: row.entitlement.source,
          reason: row.entitlement.grantReason,
        }
      : null,
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [premium, notifications] = await Promise.all([
      getEntitlementSummary(session.user.id, 'premium'),
      prisma.notification.findMany({
        where: {
          userId: session.user.id,
          type: 'premium_granted',
          displayedAt: null,
          deletedAt: null,
        },
        orderBy: { createdAt: 'asc' },
        take: 5,
        select: {
          id: true,
          type: true,
          entitlementId: true,
          title: true,
          body: true,
          createdAt: true,
          entitlement: {
            select: {
              id: true,
              startsAt: true,
              expiresAt: true,
              source: true,
              grantReason: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      premium: {
        active: premium.active,
        entitlementId: premium.entitlementId,
        startsAt: premium.startsAt?.toISOString() ?? null,
        expiresAt: premium.expiresAt?.toISOString() ?? null,
        status: premium.status,
        source: premium.source,
        reason: premium.reason,
      },
      pendingPremiumNotifications: notifications.map(formatNotification),
    });
  } catch (error) {
    console.error('GET /api/user/entitlements:', error);
    return NextResponse.json(
      { error: 'Failed to load entitlements' },
      { status: 500 }
    );
  }
}
