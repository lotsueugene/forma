import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/admin/footer/[id] - Update a footer link
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const link = await prisma.footerLink.update({
      where: { id },
      data: {
        ...(body.section !== undefined && { section: body.section }),
        ...(body.label !== undefined && { label: body.label }),
        ...(body.href !== undefined && { href: body.href }),
        ...(body.external !== undefined && { external: body.external }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.active !== undefined && { active: body.active }),
      },
    });

    return NextResponse.json({ link });
  } catch (error) {
    console.error('Error updating footer link:', error);
    return NextResponse.json(
      { error: 'Failed to update footer link' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/footer/[id] - Delete a footer link
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    await prisma.footerLink.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting footer link:', error);
    return NextResponse.json(
      { error: 'Failed to delete footer link' },
      { status: 500 }
    );
  }
}
