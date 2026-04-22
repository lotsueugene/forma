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

    // Get counts in parallel. We compute plan distribution per USER,
    // not by grouping Subscription rows — the Subscription table holds
    // both the newer user-level rows and legacy workspace-level rows,
    // so grouping there double-counts users who have both (e.g. total
    // would come out higher than totalUsers). See getOrCreateSubscription
    // for the canonical resolution order we mirror here.
    const [
      totalUsers,
      totalWorkspaces,
      totalForms,
      totalSubmissions,
      recentUsers,
      usersForPlan,
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
      prisma.user.findMany({
        select: {
          id: true,
          role: true,
          subscription: {
            select: { plan: true, trialEndsAt: true, status: true },
          },
          workspaceMembers: {
            where: { role: 'owner' },
            select: {
              workspace: {
                select: {
                  isPersonal: true,
                  subscription: {
                    select: { plan: true, trialEndsAt: true, status: true },
                  },
                },
              },
            },
          },
        },
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

    // Resolve each user's effective plan the same way the app does at
    // runtime: user-level subscription first, then the owned personal
    // workspace, then any owned workspace. Admin role users count as
    // Pro (they get Pro-equivalent features in getSubscriptionInfo).
    // Expired trials collapse to Free.
    const now = new Date();
    let free = 0, trial = 0, pro = 0;
    for (const u of usersForPlan) {
      if (u.role === 'admin') {
        pro++;
        continue;
      }

      let sub = u.subscription;
      if (!sub) {
        const owned = u.workspaceMembers.map((m) => m.workspace);
        const personal = owned.find((w) => w.isPersonal && w.subscription);
        const any = owned.find((w) => w.subscription);
        sub = personal?.subscription || any?.subscription || null;
      }

      if (!sub) { free++; continue; }
      if (sub.plan === 'pro') { pro++; continue; }
      if (
        sub.plan === 'trial' &&
        sub.trialEndsAt &&
        sub.trialEndsAt > now
      ) {
        trial++;
        continue;
      }
      free++;
    }

    const planBreakdown = {
      free,
      trial,
      pro,
      proPaying: payingSubscriptions.length, // Actual paying Stripe customers
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
