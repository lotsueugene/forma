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
        bookingSlug: form.bookingSlug,
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
    const { name, description, fields, settings, status, slug, bookingSlug } = await request.json();

    const normalizeSlug = (raw: unknown): string | null => {
      if (raw === null || raw === undefined) return null;
      const str = String(raw).trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      return str || null;
    };

    let nextSlug: string | null | undefined = undefined;
    if (slug !== undefined) {
      nextSlug = normalizeSlug(slug);
      if (nextSlug !== existingForm.slug) {
        if (nextSlug && nextSlug.length < 2) {
          return NextResponse.json({ error: 'Slug must be at least 2 characters' }, { status: 400 });
        }
        if (nextSlug) {
          // Slug must not collide with any other form's slug OR bookingSlug in the workspace,
          // because the custom-domain resolver looks up both on the same path.
          const conflict = await prisma.form.findFirst({
            where: {
              workspaceId: existingForm.workspaceId,
              id: { not: id },
              OR: [{ slug: nextSlug }, { bookingSlug: nextSlug }],
            },
          });
          if (conflict) {
            return NextResponse.json({ error: 'This slug is already used by another form' }, { status: 400 });
          }
        }
      }
    }

    let nextBookingSlug: string | null | undefined = undefined;
    if (bookingSlug !== undefined) {
      nextBookingSlug = normalizeSlug(bookingSlug);
      if (nextBookingSlug !== existingForm.bookingSlug) {
        if (nextBookingSlug && nextBookingSlug.length < 2) {
          return NextResponse.json({ error: 'Booking slug must be at least 2 characters' }, { status: 400 });
        }
        if (nextBookingSlug) {
          // Must not collide with any other form's slug/bookingSlug.
          const conflict = await prisma.form.findFirst({
            where: {
              workspaceId: existingForm.workspaceId,
              id: { not: id },
              OR: [{ slug: nextBookingSlug }, { bookingSlug: nextBookingSlug }],
            },
          });
          if (conflict) {
            return NextResponse.json({ error: 'This booking slug is already used by another form' }, { status: 400 });
          }
        }
      }
    }

    // Disallow the same slug for both on the same form (they'd resolve to two renderers for one URL).
    const effectiveSlug = nextSlug !== undefined ? nextSlug : existingForm.slug;
    const effectiveBookingSlug = nextBookingSlug !== undefined ? nextBookingSlug : existingForm.bookingSlug;
    if (effectiveSlug && effectiveBookingSlug && effectiveSlug === effectiveBookingSlug) {
      return NextResponse.json({ error: 'Slug and booking slug must be different' }, { status: 400 });
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
        slug: nextSlug !== undefined ? nextSlug : existingForm.slug,
        bookingSlug: nextBookingSlug !== undefined ? nextBookingSlug : existingForm.bookingSlug,
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
        bookingSlug: form.bookingSlug,
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
