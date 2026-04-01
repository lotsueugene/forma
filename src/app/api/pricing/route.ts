import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/pricing - Get active pricing plans (public)
export async function GET() {
  try {
    const plans = await prisma.pricingPlan.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Parse features JSON for each plan
    const parsedPlans = plans.map((plan) => ({
      ...plan,
      features: JSON.parse(plan.features),
    }));

    return NextResponse.json({ plans: parsedPlans });
  } catch (error) {
    console.error('Pricing plans error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing plans' },
      { status: 500 }
    );
  }
}
