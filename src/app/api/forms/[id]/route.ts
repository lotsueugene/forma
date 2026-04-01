import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyFormAccess } from '@/lib/workspace-auth';

// GET /api/forms/[id] - Get a single form
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

    // Verify user has access to this form through workspace
    const access = await verifyFormAccess(session.user.id, id);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.error === 'Form not found' ? 404 : 403 });
    }

    const form = await prisma.form.findUnique({
      where: { id },
      include: {
        _count: {
          select: { submissions: true },
        },
      },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    return NextResponse.json({
      form: {
        id: form.id,
        name: form.name,
        description: form.description,
        status: form.status,
        formType: form.formType,
        fields: JSON.parse(form.fields),
        settings: form.settings ? JSON.parse(form.settings) : null,
        views: form.views,
        submissions: form._count.submissions,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching form:', error);
    return NextResponse.json(
      { error: 'Failed to fetch form' },
      { status: 500 }
    );
  }
}

// PUT /api/forms/[id] - Update a form
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

    // Verify user has editor access to this form
    const access = await verifyFormAccess(session.user.id, id, 'editor');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.error === 'Form not found' ? 404 : 403 });
    }

    const existingForm = access.form!;
    const { name, description, fields, settings, status } = await request.json();

    const form = await prisma.form.update({
      where: { id },
      data: {
        name: name ?? existingForm.name,
        description: description ?? existingForm.description,
        fields: fields ? JSON.stringify(fields) : existingForm.fields,
        settings: settings ? JSON.stringify(settings) : existingForm.settings,
        status: status ?? existingForm.status,
      },
    });

    return NextResponse.json({
      form: {
        id: form.id,
        name: form.name,
        description: form.description,
        status: form.status,
        formType: form.formType,
        fields: JSON.parse(form.fields),
        settings: form.settings ? JSON.parse(form.settings) : null,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating form:', error);
    return NextResponse.json(
      { error: 'Failed to update form' },
      { status: 500 }
    );
  }
}

// DELETE /api/forms/[id] - Delete a form
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

    // Verify user has manager access to delete this form
    const access = await verifyFormAccess(session.user.id, id, 'manager');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.error === 'Form not found' ? 404 : 403 });
    }

    await prisma.form.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting form:', error);
    return NextResponse.json(
      { error: 'Failed to delete form' },
      { status: 500 }
    );
  }
}
