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
          _count: {
            select: {
              workspaceMembers: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Fetch subscriptions for these users via raw query (userId may not be in generated client)
    const userIds = users.map((u) => u.id);
    const subscriptions = await prisma.$queryRawUnsafe<
      Array<{ userId: string; plan: string; status: string; trialEndsAt: Date | null; stripeCurrentPeriodEnd: Date | null }>
    >(
      `SELECT "userId", plan, status, "trialEndsAt", "stripeCurrentPeriodEnd" FROM "Subscription" WHERE "userId" = ANY($1::text[])`,
      userIds
    );
    const subByUser = new Map(subscriptions.map((s) => [s.userId, s]));

    return NextResponse.json({
      users: users.map(u => {
        const sub = subByUser.get(u.id);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt,
          workspaceCount: u._count.workspaceMembers,
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
