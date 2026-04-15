import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { verifyWorkspaceAccess } from '@/lib/workspace-auth';
import { getSubscriptionInfo, startTrial } from '@/lib/subscription';

// GET /api/workspaces/[id]/subscription - Get subscription info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const access = await verifyWorkspaceAccess(session.user.id, id);

    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const subscription = await getSubscriptionInfo(id);

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/[id]/subscription/trial - Start a trial
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const access = await verifyWorkspaceAccess(session.user.id, id, 'owner');

    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    // Check if already had a trial
    const existingInfo = await getSubscriptionInfo(id);
    if (existingInfo.plan !== 'free') {
      return NextResponse.json(
        { error: 'Trial already used or currently on a paid plan' },
        { status: 400 }
      );
    }

    await startTrial(session.user.id, 14);
    const subscription = await getSubscriptionInfo(id);

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error('Error starting trial:', error);
    return NextResponse.json(
      { error: 'Failed to start trial' },
      { status: 500 }
    );
  }
}
