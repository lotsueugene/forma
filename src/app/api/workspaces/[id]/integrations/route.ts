import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyWorkspaceAccess } from '@/lib/workspace-auth';
import { getSubscriptionInfo } from '@/lib/subscription';
import { testIntegration, type IntegrationConfig } from '@/lib/integrations';

// GET /api/workspaces/[id]/integrations - List integrations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: workspaceId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify workspace access (viewer or higher)
    const access = await verifyWorkspaceAccess(session.user.id, workspaceId, 'viewer');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    // Check if integrations feature is available
    const subscriptionInfo = await getSubscriptionInfo(workspaceId);
    if (!subscriptionInfo.features.integrations) {
      return NextResponse.json(
        { error: 'Integrations require a Trial or Pro subscription' },
        { status: 402 }
      );
    }

    const integrations = await prisma.integration.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        name: true,
        enabled: true,
        formId: true,
        createdAt: true,
        updatedAt: true,
        // Don't expose the full config (contains secrets)
      },
    });

    return NextResponse.json({ integrations });
  } catch (error) {
    console.error('Error fetching integrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/[id]/integrations - Create integration
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: workspaceId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify workspace access (manager or higher)
    const access = await verifyWorkspaceAccess(session.user.id, workspaceId, 'manager');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    // Check if integrations feature is available
    const subscriptionInfo = await getSubscriptionInfo(workspaceId);
    if (!subscriptionInfo.features.integrations) {
      return NextResponse.json(
        { error: 'Integrations require a Trial or Pro subscription' },
        { status: 402 }
      );
    }

    const body = await request.json();
    const { type, name, config, testConnection, formId } = body as {
      type: string;
      name?: string;
      config: IntegrationConfig;
      testConnection?: boolean;
      formId?: string;
    };

    // Validate type
    const validTypes = ['slack', 'notion', 'airtable', 'google-sheets'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid integration type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate required config fields
    const validationError = validateConfig(type, config);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Test connection if requested
    if (testConnection) {
      const testResult = await testIntegration(type, config);
      if (!testResult.success) {
        return NextResponse.json(
          { error: `Connection test failed: ${testResult.error}` },
          { status: 400 }
        );
      }
    }

    // Create integration
    const integration = await prisma.integration.create({
      data: {
        workspaceId,
        type,
        name: name || getDefaultName(type),
        config: JSON.stringify(config),
        enabled: true,
        formId: formId || null,
      },
    });

    return NextResponse.json({
      integration: {
        id: integration.id,
        type: integration.type,
        name: integration.name,
        enabled: integration.enabled,
        createdAt: integration.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating integration:', error);
    return NextResponse.json(
      { error: 'Failed to create integration' },
      { status: 500 }
    );
  }
}

function validateConfig(type: string, config: IntegrationConfig): string | null {
  switch (type) {
    case 'slack':
      if (!config.webhookUrl) {
        return 'Slack webhook URL is required';
      }
      if (!/^https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+$/.test(config.webhookUrl)) {
        return 'Invalid Slack webhook URL. Expected format: https://hooks.slack.com/services/T.../B.../...';
      }
      break;

    case 'notion':
      if (!config.apiKey) {
        return 'Notion API key is required';
      }
      if (!config.databaseId) {
        return 'Notion database ID is required';
      }
      break;

    case 'airtable':
      if (!config.apiKey) {
        return 'Airtable API key is required';
      }
      if (!config.baseId) {
        return 'Airtable base ID is required';
      }
      if (!config.tableId) {
        return 'Airtable table ID is required';
      }
      break;

    case 'google-sheets':
      if (!config.accessToken && !config.refreshToken) {
        return 'Google authentication is required';
      }
      if (!config.spreadsheetId) {
        return 'Spreadsheet ID is required';
      }
      break;
  }

  return null;
}

function getDefaultName(type: string): string {
  const names: Record<string, string> = {
    slack: 'Slack',
    notion: 'Notion',
    airtable: 'Airtable',
    'google-sheets': 'Google Sheets',
  };
  return names[type] || type;
}
