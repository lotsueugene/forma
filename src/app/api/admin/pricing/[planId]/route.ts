import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/admin-auth';

// GET /api/admin/pricing/[planId] - Get single pricing plan
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId } = await params;

    const plan = await prisma.pricingPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Admin get pricing plan error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing plan' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/pricing/[planId] - Update pricing plan
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId } = await params;
    const body = await request.json();

    const plan = await prisma.pricingPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Check if slug is being changed and if it conflicts
    if (body.slug && body.slug !== plan.slug) {
      const existing = await prisma.pricingPlan.findUnique({
        where: { slug: body.slug },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'A plan with this slug already exists' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'name',
      'slug',
      'description',
      'monthlyPrice',
      'yearlyPrice',
      'submissionsLimit',
      'formsLimit',
      'membersLimit',
      'icon',
      'popular',
      'ctaText',
      'ctaLink',
      'features',
      'sortOrder',
      'active',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'features' && Array.isArray(body[field])) {
          updateData[field] = JSON.stringify(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updatedPlan = await prisma.pricingPlan.update({
      where: { id: planId },
      data: updateData,
    });

    return NextResponse.json({ plan: updatedPlan });
  } catch (error) {
    console.error('Admin update pricing plan error:', error);
    return NextResponse.json(
      { error: 'Failed to update pricing plan' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/pricing/[planId] - Delete pricing plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId } = await params;

    const plan = await prisma.pricingPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    await prisma.pricingPlan.delete({
      where: { id: planId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete pricing plan error:', error);
    return NextResponse.json(
      { error: 'Failed to delete pricing plan' },
      { status: 500 }
    );
  }
}
