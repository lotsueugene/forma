import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyFormAccess } from '@/lib/workspace-auth';
import { getSubscriptionInfo } from '@/lib/subscription';

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
      return NextResponse.json({ error: access.error }, { status: 404 });
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
        slug: form.slug,
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
      return NextResponse.json({ error: access.error }, { status: 404 });
    }

    const existingForm = access.form!;
    const { name, description, fields, settings, status, slug } = await request.json();

    // Validate slug uniqueness within workspace if provided
    if (slug !== undefined && slug !== existingForm.slug) {
      if (slug) {
        // Clean and validate slug format
        const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        if (cleanSlug.length < 2) {
          return NextResponse.json({ error: 'Slug must be at least 2 characters' }, { status: 400 });
        }

        // Check if slug is already used by another form in this workspace
        const existingSlug = await prisma.form.findFirst({
          where: {
            workspaceId: existingForm.workspaceId,
            slug: cleanSlug,
            id: { not: id },
          },
        });
        if (existingSlug) {
          return NextResponse.json({ error: 'This slug is already used by another form' }, { status: 400 });
        }
      }
    }

    // Enforce plan restrictions at save time
    if (settings) {
      const subInfo = await getSubscriptionInfo(existingForm.workspaceId);
      if (subInfo.plan === 'free') {
        // Strip pro-only settings for free users
        if (settings.thankYou?.showBranding === false) {
          settings.thankYou.showBranding = true;
        }
        if (settings.customCss) {
          delete settings.customCss;
        }
        if (settings.saveAndResume) {
          settings.saveAndResume = false;
        }
      }
    }

    const form = await prisma.form.update({
      where: { id },
      data: {
        name: name ?? existingForm.name,
        description: description ?? existingForm.description,
        slug: slug !== undefined ? (slug || null) : existingForm.slug,
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
        slug: form.slug,
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
      return NextResponse.json({ error: access.error }, { status: 404 });
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
