import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listSpreadsheets, refreshAndSaveToken } from '@/lib/integrations/google-sheets';
import { verifyWorkspaceAccess } from '@/lib/workspace-auth';
import { decryptConfig } from '@/lib/integration-secrets';

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

    // The OAuth callback created this integration for a specific workspace.
    // Verify the current session actually has manager+ access to that
    // workspace before we start handing out OAuth-backed data.
    const access = await verifyWorkspaceAccess(session.user.id, integration.workspaceId, 'manager');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const config = decryptConfig<{ accessToken?: string; refreshToken?: string }>(integration.config);

    // Refresh the token before listing
    let accessToken = config.accessToken;
    if (config.refreshToken) {
      accessToken = await refreshAndSaveToken(integrationId, config.refreshToken);
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token. Please reconnect Google Sheets.' }, { status: 400 });
    }

    const spreadsheets = await listSpreadsheets(accessToken);

    return NextResponse.json({ spreadsheets });
  } catch (error) {
    console.error('Google Sheets spreadsheets error:', error instanceof Error ? error.message : error);

    // If Drive API fails (scope not granted), return empty list so user can enter ID manually
    return NextResponse.json(
      { spreadsheets: [], error: String(error instanceof Error ? error.message : error) },
      { status: 200 }
    );
  }
}
