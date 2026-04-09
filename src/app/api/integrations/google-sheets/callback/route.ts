import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { exchangeCodeForTokens } from '@/lib/integrations/google-sheets';
import { verifyWorkspaceAccess } from '@/lib/workspace-auth';

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

    // Decode state
    let state: { workspaceId: string; formId: string; userId: string };
    try {
      state = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
    } catch {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Invalid+state', baseUrl)
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

    // Create the integration in a pending state (user still needs to pick a spreadsheet)
    const integration = await prisma.integration.create({
      data: {
        workspace: { connect: { id: state.workspaceId } },
        type: 'google-sheets',
        name: 'Google Sheets',
        config: JSON.stringify({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
        enabled: false, // Disabled until user picks a spreadsheet
        ...(state.formId ? { form: { connect: { id: state.formId } } } : {}),
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
