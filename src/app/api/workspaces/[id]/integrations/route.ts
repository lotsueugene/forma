import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyWorkspaceAccess } from '@/lib/workspace-auth';
import { getSubscriptionInfo } from '@/lib/subscription';
import { testIntegration, type IntegrationConfig } from '@/lib/integrations';
import { ALL_INTEGRATION_TYPES, getIntegrationMeta } from '@/lib/integrations/catalog';
import { encryptConfig, decryptConfig } from '@/lib/integration-secrets';
import { apiRateLimit, getClientIp } from '@/lib/api-rate-limit';
import { auditLog } from '@/lib/audit';

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

    const rows = await prisma.integration.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });

    // Compute `incomplete` per row by peeking at the decrypted config
    // against the catalog's completeness check. This lets the UI nudge
    // users to finish setup (e.g. Google Sheets picked a spreadsheet)
    // without issuing an extra round-trip per row.
    const integrations = rows.map((row) => {
      let complete = true;
      try {
        const config = decryptConfig<IntegrationConfig>(row.config);
        const meta = getIntegrationMeta(row.type);
        complete = meta ? meta.isComplete(config) : true;
      } catch {
        complete = false;
      }
      return {
        id: row.id,
        type: row.type,
        name: row.name,
        enabled: row.enabled,
        formId: row.formId,
        incomplete: !complete,
        lastRunAt: row.lastRunAt,
        lastStatus: row.lastStatus,
        lastStatusCode: row.lastStatusCode,
        lastError: row.lastError,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
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

    // Rate limit: this endpoint can trigger outbound requests (testConnection)
    // to arbitrary user-supplied hosts. The SSRF guard blocks internal
    // addresses, but rate limiting still matters to prevent quota abuse
    // against legitimate third-party providers.
    const ip = getClientIp(request);
    const rl = apiRateLimit(`integrations:${session.user.id}:${ip}`, 'auth');
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many integration changes. Try again shortly.' },
        { status: 429, headers: rl.retryAfter ? { 'Retry-After': String(rl.retryAfter) } : undefined }
      );
    }

    // Manager+ only: integrations hold third-party credentials and can
    // exfiltrate submissions to external systems.
    const access = await verifyWorkspaceAccess(session.user.id, workspaceId, 'manager');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    // Feature gate: Trial/Pro only.
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

    const meta = getIntegrationMeta(type);
    if (!meta || !ALL_INTEGRATION_TYPES.includes(type)) {
      return NextResponse.json(
        {
          error: `Invalid integration type. Must be one of: ${ALL_INTEGRATION_TYPES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const validationError = meta.validate(config || {});
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // If caller asked to test, actually hit the provider. We only do this
    // when the config is complete enough to reach the API — OAuth types
    // without a spreadsheet yet can still save as incomplete.
    if (testConnection && meta.isComplete(config)) {
      const testResult = await testIntegration(type, config);
      if (!testResult.success) {
        return NextResponse.json(
          { error: `Connection test failed: ${testResult.error}` },
          { status: 400 }
        );
      }
    }

    // Verify the formId (if provided) actually belongs to this workspace,
    // so a manager in workspace A can't create an integration that fires
    // only for workspace B's form by passing a foreign id.
    let resolvedFormId: string | null = null;
    if (formId) {
      const form = await prisma.form.findFirst({
        where: { id: formId, workspaceId },
        select: { id: true },
      });
      if (!form) {
        return NextResponse.json({ error: 'Form not found in this workspace' }, { status: 400 });
      }
      resolvedFormId = form.id;
    }

    const integration = await prisma.integration.create({
      data: {
        workspaceId,
        type,
        name: name?.trim() || meta.name,
        config: encryptConfig(config as unknown as Record<string, unknown>),
        enabled: true,
        formId: resolvedFormId,
      },
    });

    auditLog({
      action: 'integration.connected',
      userId: session.user.id,
      ip,
      resourceType: 'integration',
      resourceId: integration.id,
      details: {
        workspaceId,
        type,
        formId: resolvedFormId,
      },
    });

    return NextResponse.json({
      integration: {
        id: integration.id,
        type: integration.type,
        name: integration.name,
        enabled: integration.enabled,
        formId: integration.formId,
        incomplete: !meta.isComplete(config),
        lastRunAt: null,
        lastStatus: null,
        lastStatusCode: null,
        lastError: null,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
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
