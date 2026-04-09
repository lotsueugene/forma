import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listSpreadsheets } from '@/lib/integrations/google-sheets';

// GET /api/integrations/google-sheets/spreadsheets?integrationId=xxx
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const integrationId = request.nextUrl.searchParams.get('integrationId');
    if (!integrationId) {
      return NextResponse.json({ error: 'integrationId is required' }, { status: 400 });
    }

    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    const config = JSON.parse(integration.config) as { accessToken?: string; refreshToken?: string };
    if (!config.accessToken) {
      return NextResponse.json({ error: 'No access token' }, { status: 400 });
    }

    const spreadsheets = await listSpreadsheets(config.accessToken);

    return NextResponse.json({ spreadsheets });
  } catch (error) {
    console.error('Google Sheets spreadsheets error:', error);
    return NextResponse.json(
      { error: 'Failed to list spreadsheets' },
      { status: 500 }
    );
  }
}
