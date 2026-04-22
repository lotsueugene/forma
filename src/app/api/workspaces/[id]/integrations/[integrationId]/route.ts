import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyWorkspaceAccess } from '@/lib/workspace-auth';
import { getSubscriptionInfo } from '@/lib/subscription';
import { testIntegration, type IntegrationConfig } from '@/lib/integrations';
import { getIntegrationMeta, redactConfigForDisplay } from '@/lib/integrations/catalog';
import { encryptConfig, decryptConfig } from '@/lib/integration-secrets';
import { apiRateLimit, getClientIp } from '@/lib/api-rate-limit';
import { auditLog } from '@/lib/audit';

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

    // Manager+: even the masked config is sensitive (shape of integration,
    // prefix of tokens) and nothing on the UI needs it at lower roles.
    const access = await verifyWorkspaceAccess(session.user.id, workspaceId, 'manager');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const integration = await prisma.integration.findFirst({
      where: { id: integrationId, workspaceId },
    });

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    let maskedConfig: Record<string, unknown> = {};
    let complete = false;
    try {
      const config = decryptConfig<IntegrationConfig>(integration.config);
      const meta = getIntegrationMeta(integration.type);
      complete = meta ? meta.isComplete(config) : true;
      maskedConfig = redactConfigForDisplay(integration.type, config);
    } catch (err) {
      console.error('Failed to decrypt integration config:', err);
    }

    return NextResponse.json({
      integration: {
        id: integration.id,
        type: integration.type,
        name: integration.name,
        enabled: integration.enabled,
        formId: integration.formId,
        incomplete: !complete,
        config: maskedConfig,
        lastRunAt: integration.lastRunAt,
        lastStatus: integration.lastStatus,
        lastStatusCode: integration.lastStatusCode,
        lastError: integration.lastError,
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

    const ip = getClientIp(request);
    const rl = apiRateLimit(`integrations:${session.user.id}:${ip}`, 'auth');
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many integration changes. Try again shortly.' },
        { status: 429, headers: rl.retryAfter ? { 'Retry-After': String(rl.retryAfter) } : undefined }
      );
    }

    const access = await verifyWorkspaceAccess(session.user.id, workspaceId, 'manager');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const subscriptionInfo = await getSubscriptionInfo(workspaceId);
    if (!subscriptionInfo.features.integrations) {
      return NextResponse.json(
        { error: 'Integrations require a Trial or Pro subscription' },
        { status: 402 }
      );
    }

    const integration = await prisma.integration.findFirst({
      where: { id: integrationId, workspaceId },
    });
    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, enabled, config, formId, testConnection } = body as {
      name?: string;
      enabled?: boolean;
      config?: Partial<IntegrationConfig>;
      formId?: string | null;
      testConnection?: boolean;
    };

    const meta = getIntegrationMeta(integration.type);
    if (!meta) {
      return NextResponse.json({ error: 'Unsupported integration type' }, { status: 400 });
    }

    // Merge new config into existing config (so PATCH with just
    // { spreadsheetId: 'x' } keeps the OAuth tokens intact).
    let newConfig = decryptConfig<IntegrationConfig>(integration.config);
    if (config) {
      newConfig = { ...newConfig, ...config };
      const validationError = meta.validate(newConfig);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
    }

    // Verify the formId (if changing) belongs to this workspace.
    let resolvedFormId: string | null | undefined = undefined;
    if (formId !== undefined) {
      if (formId === null || formId === '') {
        resolvedFormId = null;
      } else {
        const form = await prisma.form.findFirst({
          where: { id: formId, workspaceId },
          select: { id: true },
        });
        if (!form) {
          return NextResponse.json({ error: 'Form not found in this workspace' }, { status: 400 });
        }
        resolvedFormId = form.id;
      }
    }

    if (testConnection && meta.isComplete(newConfig)) {
      const testResult = await testIntegration(integration.type, newConfig);
      if (!testResult.success) {
        return NextResponse.json(
          { error: `Connection test failed: ${testResult.error}` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.integration.update({
      where: { id: integrationId },
      data: {
        ...(name !== undefined && { name: name.trim() || meta.name }),
        ...(enabled !== undefined && { enabled }),
        ...(config && { config: encryptConfig(newConfig as unknown as Record<string, unknown>) }),
        ...(resolvedFormId !== undefined && { formId: resolvedFormId }),
      },
    });

    auditLog({
      action: 'integration.updated',
      userId: session.user.id,
      ip,
      resourceType: 'integration',
      resourceId: updated.id,
      details: {
        workspaceId,
        type: updated.type,
        // We record WHAT fields changed, never the values.
        changedFields: Object.keys({
          ...(name !== undefined ? { name } : {}),
          ...(enabled !== undefined ? { enabled } : {}),
          ...(config ? { config: Object.keys(config) } : {}),
          ...(resolvedFormId !== undefined ? { formId: resolvedFormId } : {}),
        }),
      },
    });

    return NextResponse.json({
      integration: {
        id: updated.id,
        type: updated.type,
        name: updated.name,
        enabled: updated.enabled,
        formId: updated.formId,
        incomplete: !meta.isComplete(newConfig),
        lastRunAt: updated.lastRunAt,
        lastStatus: updated.lastStatus,
        lastStatusCode: updated.lastStatusCode,
        lastError: updated.lastError,
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

    const access = await verifyWorkspaceAccess(session.user.id, workspaceId, 'manager');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const integration = await prisma.integration.findFirst({
      where: { id: integrationId, workspaceId },
    });
    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    await prisma.integration.delete({ where: { id: integrationId } });

    auditLog({
      action: 'integration.disconnected',
      userId: session.user.id,
      ip: getClientIp(request),
      resourceType: 'integration',
      resourceId: integration.id,
      details: { workspaceId, type: integration.type },
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

// POST /api/workspaces/[id]/integrations/[integrationId] - Manually fire a test delivery
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

    const ip = getClientIp(request);
    const rl = apiRateLimit(`integration-test:${session.user.id}:${ip}`, 'auth');
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many test requests. Try again shortly.' },
        { status: 429, headers: rl.retryAfter ? { 'Retry-After': String(rl.retryAfter) } : undefined }
      );
    }

    const access = await verifyWorkspaceAccess(session.user.id, workspaceId, 'manager');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const integration = await prisma.integration.findFirst({
      where: { id: integrationId, workspaceId },
    });
    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    const config = decryptConfig<IntegrationConfig>(integration.config);
    const result = await testIntegration(integration.type, config);

    // Record the test run on the row so the UI's "Last:" indicator
    // updates like a real delivery would.
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        lastRunAt: new Date(),
        lastStatus: result.success ? 'success' : 'error',
        lastStatusCode: result.success ? 200 : null,
        lastError: result.success ? null : (result.error || 'Unknown error').slice(0, 500),
      },
    });

    auditLog({
      action: 'integration.tested',
      userId: session.user.id,
      ip,
      resourceType: 'integration',
      resourceId: integration.id,
      details: { workspaceId, type: integration.type, success: result.success },
    });

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
