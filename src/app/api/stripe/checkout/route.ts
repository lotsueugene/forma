import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe, STRIPE_PRICES } from '@/lib/stripe';
import { verifyWorkspaceAccess } from '@/lib/workspace-auth';

// POST /api/stripe/checkout - Create a checkout session
export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment.' },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, priceType = 'monthly' } = await request.json();

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    // Verify user has admin access
    const access = await verifyWorkspaceAccess(session.user.id, workspaceId, 'admin');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    // Get or create Stripe customer
    let workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    let customerId = workspace.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email!,
        name: workspace.name,
        metadata: {
          workspaceId: workspace.id,
          userId: session.user.id,
        },
      });

      customerId = customer.id;

      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Get the price ID
    const priceId = priceType === 'yearly'
      ? STRIPE_PRICES.pro_yearly
      : STRIPE_PRICES.pro_monthly;

    // Create checkout session
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard/settings?tab=billing&success=true`,
      cancel_url: `${baseUrl}/dashboard/settings?tab=billing&canceled=true`,
      metadata: {
        workspaceId: workspace.id,
      },
      subscription_data: {
        metadata: {
          workspaceId: workspace.id,
        },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
