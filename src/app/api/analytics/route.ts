import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/analytics - Get analytics data for current workspace
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    const period = request.nextUrl.searchParams.get('period') || '30d'; // 7d, 30d, 90d

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    // Verify user has access to workspace
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: session.user.id,
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Calculate date range
    const now = new Date();
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[period] || 30;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Get all forms for workspace
    const forms = await prisma.form.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        status: true,
        views: true,
        createdAt: true,
      },
    });

    // Get all submissions in date range
    const submissions = await prisma.submission.findMany({
      where: {
        form: { workspaceId },
        createdAt: { gte: startDate },
      },
      select: {
        id: true,
        formId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Build time series data (submissions per day)
    const timeSeriesMap: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split('T')[0];
      timeSeriesMap[key] = 0;
    }

    submissions.forEach((sub) => {
      const key = sub.createdAt.toISOString().split('T')[0];
      if (timeSeriesMap[key] !== undefined) {
        timeSeriesMap[key]++;
      }
    });

    const timeSeries = Object.entries(timeSeriesMap).map(([date, count]) => ({
      date,
      submissions: count,
    }));

    // Calculate form stats
    const formSubmissionCounts: Record<string, number> = {};
    submissions.forEach((sub) => {
      formSubmissionCounts[sub.formId] = (formSubmissionCounts[sub.formId] || 0) + 1;
    });

    const formStats = forms.map((form) => {
      const submissionCount = formSubmissionCounts[form.id] || 0;
      const views = form.views || 0;
      return {
        id: form.id,
        name: form.name,
        status: form.status,
        submissions: submissionCount,
        views,
        conversion: views > 0 ? Math.round((submissionCount / views) * 1000) / 10 : 0,
      };
    });

    // Sort by submissions
    formStats.sort((a, b) => b.submissions - a.submissions);

    // Calculate totals
    const totalSubmissions = submissions.length;
    const totalViews = forms.reduce((acc, f) => acc + (f.views || 0), 0);
    const activeForms = forms.filter((f) => f.status === 'active').length;

    // Calculate previous period for comparison
    const prevStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);
    const prevSubmissions = await prisma.submission.count({
      where: {
        form: { workspaceId },
        createdAt: {
          gte: prevStartDate,
          lt: startDate,
        },
      },
    });

    const submissionGrowth = prevSubmissions > 0
      ? Math.round(((totalSubmissions - prevSubmissions) / prevSubmissions) * 100)
      : totalSubmissions > 0 ? 100 : 0;

    // Submissions by form (for pie chart)
    const submissionsByForm = formStats
      .filter((f) => f.submissions > 0)
      .slice(0, 5)
      .map((f) => ({
        name: f.name,
        value: f.submissions,
      }));

    // Submissions by hour of day
    const hourlyDistribution = Array(24).fill(0);
    submissions.forEach((sub) => {
      const hour = sub.createdAt.getHours();
      hourlyDistribution[hour]++;
    });

    const submissionsByHour = hourlyDistribution.map((count, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      submissions: count,
    }));

    return NextResponse.json({
      summary: {
        totalSubmissions,
        totalViews,
        activeForms,
        totalForms: forms.length,
        avgConversion: totalViews > 0 ? Math.round((totalSubmissions / totalViews) * 1000) / 10 : 0,
        submissionGrowth,
      },
      timeSeries,
      formStats: formStats.slice(0, 10),
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
