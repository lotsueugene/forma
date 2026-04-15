import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyFormAccess } from '@/lib/workspace-auth';

// GET /api/forms/[id]/automations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await verifyFormAccess(session.user.id, id);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50'), 200);
    const skip = (page - 1) * limit;

    const [automations, total] = await Promise.all([
      prisma.automation.findMany({
        where: { formId: id },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip,
      }),
      prisma.automation.count({ where: { formId: id } }),
    ]);

    return NextResponse.json({
      automations: automations.map(a => ({
        ...a,
        actions: (() => { try { return JSON.parse(a.actions); } catch { return []; } })(),
        conditions: (() => { try { return a.conditions ? JSON.parse(a.conditions) : null; } catch { return null; } })(),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching automations:', error);
    return NextResponse.json({ error: 'Failed to fetch automations' }, { status: 500 });
  }
}

// POST /api/forms/[id]/automations
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await verifyFormAccess(session.user.id, id, 'editor');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { name, trigger, actions, conditions, enabled } = await request.json();

    if (!name || !actions || !Array.isArray(actions)) {
      return NextResponse.json({ error: 'name and actions are required' }, { status: 400 });
    }

    const automation = await prisma.automation.create({
      data: {
        formId: id,
        name,
        trigger: trigger || 'submission',
        enabled: enabled ?? true,
        actions: JSON.stringify(actions),
        conditions: conditions ? JSON.stringify(conditions) : null,
      },
    });

    return NextResponse.json({
      automation: {
        ...automation,
        actions: JSON.parse(automation.actions),
        conditions: automation.conditions ? JSON.parse(automation.conditions) : null,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating automation:', error);
    return NextResponse.json({ error: 'Failed to create automation' }, { status: 500 });
  }
}

// PUT /api/forms/[id]/automations - Update an automation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await verifyFormAccess(session.user.id, id, 'editor');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { automationId, name, actions, conditions, enabled } = await request.json();

    if (!automationId) {
      return NextResponse.json({ error: 'automationId is required' }, { status: 400 });
    }

    const automation = await prisma.automation.update({
      where: { id: automationId, formId: id },
      data: {
        ...(name !== undefined && { name }),
        ...(actions !== undefined && { actions: JSON.stringify(actions) }),
        ...(conditions !== undefined && { conditions: conditions ? JSON.stringify(conditions) : null }),
        ...(enabled !== undefined && { enabled }),
      },
    });

    return NextResponse.json({
      automation: {
        ...automation,
        actions: JSON.parse(automation.actions),
        conditions: automation.conditions ? JSON.parse(automation.conditions) : null,
      },
    });
  } catch (error) {
    console.error('Error updating automation:', error);
    return NextResponse.json({ error: 'Failed to update automation' }, { status: 500 });
  }
}

// DELETE /api/forms/[id]/automations
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await verifyFormAccess(session.user.id, id, 'editor');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { automationId } = await request.json();

    if (!automationId) {
      return NextResponse.json({ error: 'automationId is required' }, { status: 400 });
    }

    await prisma.automation.delete({
      where: { id: automationId, formId: id },
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error deleting automation:', error);
    return NextResponse.json({ error: 'Failed to delete automation' }, { status: 500 });
  }
}
