import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { verifyWorkspaceAccess } from '@/lib/workspace-auth';

// POST /api/stripe/connect - Create a Stripe Connect onboarding link
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const { workspaceId } = await request.json();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    const access = await verifyWorkspaceAccess(session.user.id, workspaceId, 'manager');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    let accountId = workspace.stripeConnectAccountId;

    // Create a new Connect account if none exists
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'standard',
        metadata: {
          workspaceId,
        },
      });
      accountId = account.id;

      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { stripeConnectAccountId: accountId },
      });
    }

    // Create an account link for onboarding
    // Use NEXTAUTH_URL or X-Forwarded-Host to get the real domain (not localhost from reverse proxy)
    const forwardedHost = request.headers.get('x-forwarded-host');
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const origin = forwardedHost
      ? `${proto}://${forwardedHost}`
      : process.env.NEXTAUTH_URL || request.nextUrl.origin;
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard/settings?tab=billing&stripe_connect=refresh`,
      return_url: `${origin}/dashboard/settings?tab=billing&stripe_connect=success`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error('Error creating Stripe Connect link:', error);
    return NextResponse.json(
      { error: 'Failed to create Stripe Connect link' },
      { status: 500 }
    );
  }
}

// GET /api/stripe/connect?workspaceId=... - Get Connect account status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    const access = await verifyWorkspaceAccess(session.user.id, workspaceId);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace?.stripeConnectAccountId) {
      return NextResponse.json({ connected: false });
    }

    const account = await stripe.accounts.retrieve(workspace.stripeConnectAccountId);

    return NextResponse.json({
      connected: true,
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      email: account.email,
      businessName: account.business_profile?.name || null,
    });
  } catch (error) {
    console.error('Error fetching Stripe Connect status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Stripe Connect status' },
      { status: 500 }
    );
  }
}

// DELETE /api/stripe/connect - Disconnect Stripe account
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = await request.json();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    const access = await verifyWorkspaceAccess(session.user.id, workspaceId, 'manager');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { stripeConnectAccountId: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Stripe Connect:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
