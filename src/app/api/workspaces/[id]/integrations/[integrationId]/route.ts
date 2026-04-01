import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyWorkspaceAccess } from '@/lib/workspace-auth';
import { getSubscriptionInfo } from '@/lib/subscription';
import { testIntegration, type IntegrationConfig } from '@/lib/integrations';

// GET /api/workspaces/[id]/integrations/[integrationId] - Get integration details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; integrationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: workspaceId, integrationId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify workspace access
    const access = await verifyWorkspaceAccess(session.user.id, workspaceId, 'viewer');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const integration = await prisma.integration.findFirst({
      where: {
        id: integrationId,
        workspaceId,
      },
    });

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Parse config but mask sensitive fields
    const config = JSON.parse(integration.config) as IntegrationConfig;
    const maskedConfig = maskSensitiveFields(integration.type, config);

    return NextResponse.json({
      integration: {
        id: integration.id,
        type: integration.type,
        name: integration.name,
        enabled: integration.enabled,
        config: maskedConfig,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching integration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integration' },
      { status: 500 }
    );
  }
}

// PATCH /api/workspaces/[id]/integrations/[integrationId] - Update integration
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; integrationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: workspaceId, integrationId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify workspace access (admin or higher)
    const access = await verifyWorkspaceAccess(session.user.id, workspaceId, 'admin');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const integration = await prisma.integration.findFirst({
      where: {
        id: integrationId,
        workspaceId,
      },
    });

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, enabled, config, testConnection } = body as {
      name?: string;
      enabled?: boolean;
      config?: Partial<IntegrationConfig>;
      testConnection?: boolean;
    };

    // Merge config if provided
    let newConfig = JSON.parse(integration.config) as IntegrationConfig;
    if (config) {
      newConfig = { ...newConfig, ...config };
    }

    // Test connection if requested
    if (testConnection) {
      const testResult = await testIntegration(integration.type, newConfig);
      if (!testResult.success) {
        return NextResponse.json(
          { error: `Connection test failed: ${testResult.error}` },
          { status: 400 }
        );
      }
    }

    // Update integration
    const updated = await prisma.integration.update({
      where: { id: integrationId },
      data: {
        ...(name !== undefined && { name }),
        ...(enabled !== undefined && { enabled }),
        ...(config && { config: JSON.stringify(newConfig) }),
      },
    });

    return NextResponse.json({
      integration: {
        id: updated.id,
        type: updated.type,
        name: updated.name,
        enabled: updated.enabled,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating integration:', error);
    return NextResponse.json(
      { error: 'Failed to update integration' },
      { status: 500 }
    );
  }
}

// DELETE /api/workspaces/[id]/integrations/[integrationId] - Delete integration
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; integrationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: workspaceId, integrationId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify workspace access (admin or higher)
    const access = await verifyWorkspaceAccess(session.user.id, workspaceId, 'admin');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const integration = await prisma.integration.findFirst({
      where: {
        id: integrationId,
        workspaceId,
      },
    });

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    await prisma.integration.delete({
      where: { id: integrationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting integration:', error);
    return NextResponse.json(
      { error: 'Failed to delete integration' },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/[id]/integrations/[integrationId] - Test integration
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; integrationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: workspaceId, integrationId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify workspace access
    const access = await verifyWorkspaceAccess(session.user.id, workspaceId, 'admin');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const integration = await prisma.integration.findFirst({
      where: {
        id: integrationId,
        workspaceId,
      },
    });

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    const config = JSON.parse(integration.config) as IntegrationConfig;
    const result = await testIntegration(integration.type, config);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error testing integration:', error);
    return NextResponse.json(
      { error: 'Failed to test integration' },
      { status: 500 }
    );
  }
}

function maskSensitiveFields(type: string, config: IntegrationConfig): Record<string, unknown> {
  const masked = { ...config } as Record<string, unknown>;

  // Mask API keys and tokens
  const sensitiveFields = ['apiKey', 'accessToken', 'refreshToken', 'webhookUrl'];

  for (const field of sensitiveFields) {
    if (masked[field] && typeof masked[field] === 'string') {
      const value = masked[field] as string;
      masked[field] = value.slice(0, 8) + '...' + value.slice(-4);
    }
  }

  return masked;
}
