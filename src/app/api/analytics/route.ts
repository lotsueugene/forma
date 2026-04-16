import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSubscriptionInfo } from '@/lib/subscription';

// GET /api/analytics - Get analytics data for current workspace
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    const period = request.nextUrl.searchParams.get('period') || '30d';

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: session.user.id },
    });

    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const info = await getSubscriptionInfo(workspaceId);
    if (!info.features.analytics) {
      return NextResponse.json(
        { error: 'Analytics requires Trial or Pro plan.' },
        { status: 402 }
      );
    }

    const now = new Date();
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[period] || 30;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const prevStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);

    // All aggregations — no row loading
    const [
      totalForms,
      activeForms,
      totalViewsAgg,
      totalSubmissions,
      prevSubmissions,
      formStats,
      dailySubmissions,
      hourlySubmissions,
    ] = await Promise.all([
      // Total forms
      prisma.form.count({ where: { workspaceId } }),
      // Active forms
      prisma.form.count({ where: { workspaceId, status: 'active' } }),
      // Total views (SUM)
      prisma.form.aggregate({ where: { workspaceId }, _sum: { views: true } }),
      // Total submissions in period
      prisma.submission.count({
        where: { form: { workspaceId }, createdAt: { gte: startDate } },
      }),
      // Previous period submissions (for growth calc)
      prisma.submission.count({
        where: { form: { workspaceId }, createdAt: { gte: prevStartDate, lt: startDate } },
      }),
      // Top 10 forms by submission count in period
      prisma.form.findMany({
        where: { workspaceId },
        select: {
          id: true,
          name: true,
          status: true,
          views: true,
          _count: { select: { submissions: true } },
        },
        orderBy: { submissions: { _count: 'desc' } },
        take: 10,
      }),
      // Daily submissions via raw SQL (grouped by date)
      prisma.$queryRaw<Array<{ day: string; count: bigint }>>`
        SELECT DATE("createdAt") as day, COUNT(*) as count
        FROM "Submission"
        WHERE "formId" IN (SELECT id FROM "Form" WHERE "workspaceId" = ${workspaceId})
          AND "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt")
        ORDER BY day
      `,
      // Hourly distribution via raw SQL
      prisma.$queryRaw<Array<{ hour: number; count: bigint }>>`
        SELECT EXTRACT(HOUR FROM "createdAt")::int as hour, COUNT(*) as count
        FROM "Submission"
        WHERE "formId" IN (SELECT id FROM "Form" WHERE "workspaceId" = ${workspaceId})
          AND "createdAt" >= ${startDate}
        GROUP BY hour
        ORDER BY hour
      `,
    ]);

    const totalViews = totalViewsAgg._sum.views || 0;

    // Build time series with zero-fill
    const timeSeriesMap: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      timeSeriesMap[date.toISOString().split('T')[0]] = 0;
    }
    for (const row of dailySubmissions) {
      const key = typeof row.day === 'string' ? row.day : new Date(row.day).toISOString().split('T')[0];
      if (timeSeriesMap[key] !== undefined) {
        timeSeriesMap[key] = Number(row.count);
      }
    }
    const timeSeries = Object.entries(timeSeriesMap).map(([date, count]) => ({
      date,
      submissions: count,
    }));

    // Format form stats
    const formStatsFormatted = formStats.map((f) => {
      const submissions = f._count.submissions;
      const views = f.views || 0;
      return {
        id: f.id,
        name: f.name,
        status: f.status,
        submissions,
        views,
        conversion: views > 0 ? Math.round((submissions / views) * 1000) / 10 : 0,
      };
    });

    // Submissions by form (for pie chart)
    const submissionsByForm = formStatsFormatted
      .filter((f) => f.submissions > 0)
      .slice(0, 5)
      .map((f) => ({ name: f.name, value: f.submissions }));

    // Hourly distribution (zero-fill 24 hours)
    const hourlyMap = Array(24).fill(0);
    for (const row of hourlySubmissions) {
      hourlyMap[row.hour] = Number(row.count);
    }
    const submissionsByHour = hourlyMap.map((count, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      submissions: count,
    }));

    const submissionGrowth = prevSubmissions > 0
      ? Math.round(((totalSubmissions - prevSubmissions) / prevSubmissions) * 100)
      : totalSubmissions > 0 ? 100 : 0;

    return NextResponse.json({
      summary: {
        totalSubmissions,
        totalViews,
        activeForms,
        totalForms,
        avgConversion: totalViews > 0 ? Math.round((totalSubmissions / totalViews) * 1000) / 10 : 0,
        submissionGrowth,
      },
      timeSeries,
      formStats: formStatsFormatted,
      submissionsByForm,
      submissionsByHour,
      period,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
