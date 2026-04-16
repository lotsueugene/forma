import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyWorkspaceAccess } from '@/lib/workspace-auth';

// GET /api/forms/stats - Lightweight workspace stats (no plan restriction)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = request.nextUrl.searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    const access = await verifyWorkspaceAccess(session.user.id, workspaceId);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    // Run all counts in parallel — pure aggregations, no row loading
    const [totalForms, activeForms, totalSubmissions, totalViews] = await Promise.all([
      prisma.form.count({ where: { workspaceId } }),
      prisma.form.count({ where: { workspaceId, status: 'active' } }),
      prisma.submission.count({
        where: { form: { workspaceId } },
      }),
      prisma.form.aggregate({
        where: { workspaceId },
        _sum: { views: true },
      }),
    ]);

    return NextResponse.json({
      totalForms,
      activeForms,
      totalSubmissions,
      totalViews: totalViews._sum.views || 0,
    });
  } catch (error) {
    console.error('Error fetching form stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
