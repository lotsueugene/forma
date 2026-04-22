import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { exchangeCodeForTokens } from '@/lib/integrations/google-sheets';
import { verifyWorkspaceAccess } from '@/lib/workspace-auth';
import { encryptConfig } from '@/lib/integration-secrets';
import { auditLog } from '@/lib/audit';
import { getClientIp } from '@/lib/api-rate-limit';

// GET /api/integrations/google-sheets/callback?code=xxx&state=xxx
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/login', baseUrl));
    }

    const code = request.nextUrl.searchParams.get('code');
    const stateParam = request.nextUrl.searchParams.get('state');
    const error = request.nextUrl.searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard/integrations?error=${encodeURIComponent(error)}`, baseUrl)
      );
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Missing+authorization+code', baseUrl)
      );
    }

    // Decode and verify HMAC-signed state
    let state: { workspaceId: string; formId: string; userId: string; ts: number; sig: string };
    try {
      state = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
    } catch {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Invalid+state', baseUrl)
      );
    }

    // Verify HMAC signature to prevent state tampering
    const { createHmac } = await import('crypto');
    const { sig, ...stateData } = state;
    const expectedSig = createHmac('sha256', process.env.NEXTAUTH_SECRET || '')
      .update(JSON.stringify(stateData))
      .digest('hex');
    if (sig !== expectedSig) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Invalid+state+signature', baseUrl)
      );
    }

    // Reject states older than 10 minutes
    if (Date.now() - state.ts > 600000) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=State+expired', baseUrl)
      );
    }

    // Verify the session user matches the state user
    if (session.user.id !== state.userId) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Session+mismatch', baseUrl)
      );
    }

    // Verify workspace access
    const access = await verifyWorkspaceAccess(session.user.id, state.workspaceId, 'manager');
    if (!access.allowed) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Workspace+access+denied', baseUrl)
      );
    }

    // Exchange code for tokens
    const redirectUri = `${baseUrl}/api/integrations/google-sheets/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // Create the integration in a pending state (user still needs to pick a spreadsheet).
    // Tokens are AES-GCM encrypted at rest — see integration-secrets.ts.
    const integration = await prisma.integration.create({
      data: {
        workspace: { connect: { id: state.workspaceId } },
        type: 'google-sheets',
        name: 'Google Sheets',
        config: encryptConfig({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
        enabled: false, // Disabled until user picks a spreadsheet
        ...(state.formId ? { form: { connect: { id: state.formId } } } : {}),
      },
    });

    auditLog({
      action: 'integration.connected',
      userId: session.user.id,
      ip: getClientIp(request),
      resourceType: 'integration',
      resourceId: integration.id,
      details: {
        workspaceId: state.workspaceId,
        type: 'google-sheets',
        formId: state.formId || null,
        pending: true,
      },
    });

    return NextResponse.redirect(
      new URL(
        `/dashboard/integrations?google_sheets_connected=${integration.id}`,
        baseUrl
      )
    );
  } catch (error) {
    console.error('Google Sheets callback error:', error);
    return NextResponse.redirect(
      new URL(
        `/dashboard/integrations?error=${encodeURIComponent('Failed to connect Google Sheets')}`,
        baseUrl
      )
    );
  }
}
