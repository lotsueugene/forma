import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyFormAccess } from '@/lib/workspace-auth';
import { getSubscriptionInfo } from '@/lib/subscription';

interface GeoData {
  country: string;
  countryCode: string;
  city: string;
  continent: string;
}

interface SubmissionMetadata {
  geo?: GeoData;
  submittedAt?: string;
  userAgent?: string;
}

// GET /api/forms/[id]/analytics - Get analytics data for a form
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this form
    const access = await verifyFormAccess(session.user.id, id);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.error === 'Form not found' ? 404 : 403 });
    }

    // Check subscription - analytics requires Trial or Pro
    const subscriptionInfo = await getSubscriptionInfo(access.form!.workspaceId);
    if (!subscriptionInfo.features.analytics) {
      return NextResponse.json(
        { error: 'Analytics requires Trial or Pro plan.' },
        { status: 402 }
      );
    }

    // Get form with views
    const form = await prisma.form.findUnique({
      where: { id },
      select: { views: true, createdAt: true },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Get all submissions
    const submissions = await prisma.submission.findMany({
      where: { formId: id },
      select: { createdAt: true, metadata: true },
      orderBy: { createdAt: 'asc' },
    });

    // Process submissions for analytics
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Submissions by day (last 30 days)
    const submissionsByDay: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split('T')[0];
      submissionsByDay[key] = 0;
    }

    // Geo data aggregation
    const countryCount: Record<string, number> = {};
    const continentCount: Record<string, number> = {};
    const cityCount: Record<string, number> = {};

    // Submissions by hour (for heatmap)
    const hourlyDistribution: number[] = Array(24).fill(0);

    // Submissions by day of week
    const weekdayDistribution: number[] = Array(7).fill(0);

    let recentSubmissions = 0;

    submissions.forEach((sub) => {
      const date = new Date(sub.createdAt);
      const dateKey = date.toISOString().split('T')[0];

      // Count by day
      if (submissionsByDay[dateKey] !== undefined) {
        submissionsByDay[dateKey]++;
      }

      // Recent submissions (last 7 days)
      if (date >= sevenDaysAgo) {
        recentSubmissions++;
      }

      // Hourly distribution
      hourlyDistribution[date.getHours()]++;

      // Weekday distribution (0 = Sunday)
      weekdayDistribution[date.getDay()]++;

      // Geo data
      if (sub.metadata) {
        try {
          const meta = JSON.parse(sub.metadata) as SubmissionMetadata;
          if (meta.geo) {
            const { country, countryCode, city, continent } = meta.geo;

            if (country) {
              const countryKey = `${country}|${countryCode}`;
              countryCount[countryKey] = (countryCount[countryKey] || 0) + 1;
            }
            if (continent) {
              continentCount[continent] = (continentCount[continent] || 0) + 1;
            }
            if (city && country) {
              const cityKey = `${city}, ${country}`;
              cityCount[cityKey] = (cityCount[cityKey] || 0) + 1;
            }
          }
        } catch {
          // Skip invalid metadata
        }
      }
    });

    // Convert to arrays for charts
    const dailyData = Object.entries(submissionsByDay).map(([date, count]) => ({
      date,
      submissions: count,
    }));

    const countryData = Object.entries(countryCount)
      .map(([key, count]) => {
        const [country, code] = key.split('|');
        return { country, code, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const continentData = Object.entries(continentCount)
      .map(([continent, count]) => ({ continent, count }))
      .sort((a, b) => b.count - a.count);

    const topCities = Object.entries(cityCount)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate stats
    const totalSubmissions = submissions.length;
    const conversionRate = form.views > 0 ? (totalSubmissions / form.views) * 100 : 0;

    // Previous 7 days submissions (for comparison)
    const previousSevenDays = submissions.filter((s) => {
      const date = new Date(s.createdAt);
      return date >= new Date(sevenDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000) && date < sevenDaysAgo;
    }).length;

    const submissionsTrend = previousSevenDays > 0
      ? ((recentSubmissions - previousSevenDays) / previousSevenDays) * 100
      : recentSubmissions > 0 ? 100 : 0;

    return NextResponse.json({
      overview: {
        totalSubmissions,
        totalViews: form.views,
        conversionRate: conversionRate.toFixed(1),
        recentSubmissions,
        submissionsTrend: submissionsTrend.toFixed(1),
      },
      charts: {
        daily: dailyData,
        hourly: hourlyDistribution,
        weekday: weekdayDistribution,
      },
      geo: {
        countries: countryData,
        continents: continentData,
        topCities,
        hasGeoData: countryData.length > 0,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
