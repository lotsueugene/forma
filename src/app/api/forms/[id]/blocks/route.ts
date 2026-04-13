import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyFormAccess } from '@/lib/workspace-auth';

// GET /api/forms/[id]/blocks - List booking blocks for a form
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

    const blocks = await prisma.bookingBlock.findMany({
      where: { formId: id },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json({ blocks });
  } catch (error) {
    console.error('Error fetching booking blocks:', error);
    return NextResponse.json({ error: 'Failed to fetch blocks' }, { status: 500 });
  }
}

// POST /api/forms/[id]/blocks - Create a booking block
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

    const { fieldId, date, startTime, endTime, reason } = await request.json();

    if (!fieldId || !date) {
      return NextResponse.json({ error: 'fieldId and date are required' }, { status: 400 });
    }

    const block = await prisma.bookingBlock.create({
      data: {
        formId: id,
        fieldId,
        date,
        startTime: startTime || null,
        endTime: endTime || null,
        reason: reason || null,
      },
    });

    return NextResponse.json({ block }, { status: 201 });
  } catch (error) {
    console.error('Error creating booking block:', error);
    return NextResponse.json({ error: 'Failed to create block' }, { status: 500 });
  }
}

// DELETE /api/forms/[id]/blocks - Delete booking blocks
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

    const { blockId } = await request.json();

    if (!blockId) {
      return NextResponse.json({ error: 'blockId is required' }, { status: 400 });
    }

    await prisma.bookingBlock.delete({
      where: { id: blockId, formId: id },
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error deleting booking block:', error);
    return NextResponse.json({ error: 'Failed to delete block' }, { status: 500 });
  }
}
