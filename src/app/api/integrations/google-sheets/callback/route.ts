import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { exchangeCodeForTokens } from '@/lib/integrations/google-sheets';
import { verifyWorkspaceAccess } from '@/lib/workspace-auth';

// GET /api/integrations/google-sheets/callback?code=xxx&state=xxx
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const code = request.nextUrl.searchParams.get('code');
    const stateParam = request.nextUrl.searchParams.get('state');
    const error = request.nextUrl.searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard/integrations?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Missing+authorization+code', request.url)
      );
    }

    // Decode state
    let state: { workspaceId: string; formId: string; userId: string };
    try {
      state = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
    } catch {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Invalid+state', request.url)
      );
    }

    // Verify the session user matches the state user
    if (session.user.id !== state.userId) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Session+mismatch', request.url)
      );
    }

    // Verify workspace access
    const access = await verifyWorkspaceAccess(session.user.id, state.workspaceId, 'manager');
    if (!access.allowed) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Workspace+access+denied', request.url)
      );
    }

    // Exchange code for tokens
    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
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
        request.url
      )
    );
  } catch (error) {
    console.error('Google Sheets callback error:', error);
    return NextResponse.redirect(
      new URL(
        `/dashboard/integrations?error=${encodeURIComponent('Failed to connect Google Sheets')}`,
        request.url
      )
    );
  }
}
