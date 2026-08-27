import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/admin-auth';

// GET /api/admin/users - List all users with pagination
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';

    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { id: { contains: search } },
          { email: { contains: search } },
          { name: { contains: search } },
        ],
      }),
      ...(role && { role }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { role: 'asc' },
          { createdAt: 'desc' },
        ],
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          suspendedAt: true,
          suspendedReason: true,
          _count: {
            select: {
              workspaceMembers: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Fetch subscriptions for these users via parameterized raw query
    const userIds = users.map((u) => u.id);
    const subscriptions = userIds.length > 0
      ? await prisma.$queryRaw<
          Array<{ userId: string; plan: string; status: string; trialEndsAt: Date | null; stripeCurrentPeriodEnd: Date | null }>
        >`SELECT "userId", plan, status, "trialEndsAt", "stripeCurrentPeriodEnd" FROM "Subscription" WHERE "userId" = ANY(${userIds}::text[])`
          .catch((error) => {
            console.error('User subscription badges unavailable:', error);
            return [];
          })
      : [];
    const subByUser = new Map(subscriptions.map((s) => [s.userId, s]));
    const now = new Date();
    const premiumRows = userIds.length > 0
      ? await prisma.entitlement.findMany({
          where: {
            userId: { in: userIds },
            type: 'premium',
            startsAt: { lte: now },
            revokedAt: null,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } },
            ],
          },
          select: { id: true, userId: true, startsAt: true, expiresAt: true },
        }).catch((error) => {
          console.error('Premium entitlement user badges unavailable:', error);
          return [];
        })
      : [];
    const premiumByUser = new Map<string, { active: boolean; entitlementId: string; startsAt: Date; expiresAt: Date | null }>();
    for (const row of premiumRows) {
      const current = premiumByUser.get(row.userId);
      if (!current) {
        premiumByUser.set(row.userId, {
          active: true,
          entitlementId: row.id,
          startsAt: row.startsAt,
          expiresAt: row.expiresAt,
        });
        continue;
      }
      if (current.expiresAt == null) continue;
      if (row.expiresAt == null || row.expiresAt > current.expiresAt) {
        premiumByUser.set(row.userId, {
          active: true,
          entitlementId: row.id,
          startsAt: row.startsAt,
          expiresAt: row.expiresAt,
        });
      }
    }

    return NextResponse.json({
      users: users.map(u => {
        const sub = subByUser.get(u.id);
        const premium = premiumByUser.get(u.id);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt,
          suspendedAt: u.suspendedAt,
          suspendedReason: u.suspendedReason,
          workspaceCount: u._count.workspaceMembers,
          premium: premium
            ? {
                active: true,
                entitlementId: premium.entitlementId,
                startsAt: premium.startsAt,
                expiresAt: premium.expiresAt,
              }
            : { active: false, entitlementId: null, startsAt: null, expiresAt: null },
          subscription: sub
            ? {
                plan: sub.plan,
                status: sub.status,
                trialEndsAt: sub.trialEndsAt,
                renewsAt: sub.stripeCurrentPeriodEnd,
              }
            : null,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
