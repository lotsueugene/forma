import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/admin-auth';

// GET /api/admin/pricing - List all pricing plans
export async function GET() {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const plans = await prisma.pricingPlan.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Admin pricing plans error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing plans' },
      { status: 500 }
    );
  }
}

// POST /api/admin/pricing - Create pricing plan
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      slug,
      description,
      monthlyPrice,
      yearlyPrice,
      icon = 'Lightning',
      popular = false,
      ctaText = 'Get Started',
      ctaLink,
      features = [],
      sortOrder = 0,
      active = true,
    } = body;

    if (!name || !slug || !description) {
      return NextResponse.json(
        { error: 'Name, slug, and description are required' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existing = await prisma.pricingPlan.findUnique({
      where: { slug },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'A plan with this slug already exists' },
        { status: 400 }
      );
    }

    const plan = await prisma.pricingPlan.create({
      data: {
        name,
        slug,
        description,
        monthlyPrice,
        yearlyPrice,
        icon,
        popular,
        ctaText,
        ctaLink,
        features: JSON.stringify(features),
        sortOrder,
        active,
      },
    });

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Admin create pricing plan error:', error);
    return NextResponse.json(
      { error: 'Failed to create pricing plan' },
      { status: 500 }
    );
  }
}
