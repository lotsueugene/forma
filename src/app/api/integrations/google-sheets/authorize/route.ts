import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { buildGoogleAuthUrl } from '@/lib/integrations/google-sheets';

// GET /api/integrations/google-sheets/authorize?workspaceId=xxx&formId=yyy
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const formId = request.nextUrl.searchParams.get('formId') || '';

    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/integrations/google-sheets/callback`;

    // Encode workspace + form + user in state
    const state = Buffer.from(
      JSON.stringify({ workspaceId, formId, userId: session.user.id })
    ).toString('base64url');

    const authUrl = buildGoogleAuthUrl(redirectUri, state);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Google Sheets authorize error:', error);
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    );
  }
}
