import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/admin-auth';
import { STRIPE_PRICES } from '@/lib/stripe';
import { checkApiRateLimit } from '@/lib/api-rate-limiter';

// GET /api/admin - Get platform overview stats
export async function GET() {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!checkApiRateLimit(`admin:${admin.user.id}`, 30)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Get counts in parallel
    const [
      totalUsers,
      totalWorkspaces,
      totalForms,
      totalSubmissions,
      recentUsers,
      subscriptionStats,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.workspace.count(),
      prisma.form.count(),
      prisma.submission.count(),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      }),
      prisma.subscription.groupBy({
        by: ['plan'],
        _count: { plan: true },
      }),
    ]);

    // Calculate MRR (Monthly Recurring Revenue) - only count actual paying customers
    const payingSubscriptions = await prisma.subscription.findMany({
      where: {
        plan: 'pro',
        stripeSubscriptionId: { not: null }, // Only actual Stripe customers, not admin freebies
      },
      select: { stripePriceId: true },
    });

    let mrr = 0;
    for (const sub of payingSubscriptions) {
      if (sub.stripePriceId === STRIPE_PRICES.pro_yearly) {
        mrr += 12.5; // $150/year = $12.50/month
      } else {
        mrr += 15; // $15/month
      }
    }
    mrr = Math.round(mrr * 100) / 100; // Round to 2 decimal places

    // Get signups over last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSignups = await prisma.user.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // Format subscription stats
    const proCount = subscriptionStats.find(s => s.plan === 'pro')?._count.plan || 0;
    const planBreakdown = {
      free: subscriptionStats.find(s => s.plan === 'free')?._count.plan || 0,
      trial: subscriptionStats.find(s => s.plan === 'trial')?._count.plan || 0,
      pro: proCount,
      proPaying: payingSubscriptions.length, // Actual paying customers
    };

    return NextResponse.json({
      stats: {
        totalUsers,
        totalWorkspaces,
        totalForms,
        totalSubmissions,
        mrr,
        recentSignups,
        planBreakdown,
      },
      recentUsers,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    );
  }
}
