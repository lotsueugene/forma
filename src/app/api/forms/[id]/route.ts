import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyFormAccess } from '@/lib/workspace-auth';
import { getSubscriptionInfo } from '@/lib/subscription';
import { auditLog } from '@/lib/audit';
import { getClientIp } from '@/lib/api-rate-limit';
import { normalizeSlug, validateSlug, slugRedirectExpiresAt } from '@/lib/slug';

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

    // Editor is the baseline for any edit on this form. Slug/bookingSlug
    // changes require a stricter manager+ check below because they affect
    // public URLs on the workspace's shared custom domain.
    const access = await verifyFormAccess(session.user.id, id, 'editor');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 404 });
    }

    const existingForm = access.form!;
    const { name, description, fields, settings, status, slug, bookingSlug } = await request.json();

    // Determine whether the request is trying to change slug or bookingSlug.
    // We only gate the stricter role check on actual changes so editors can
    // still save the rest of this form (social preview, status, etc.) in the
    // same request without being blocked.
    const slugWouldChange =
      slug !== undefined && normalizeSlug(slug) !== existingForm.slug;
    const bookingSlugWouldChange =
      bookingSlug !== undefined && normalizeSlug(bookingSlug) !== existingForm.bookingSlug;

    if (slugWouldChange || bookingSlugWouldChange) {
      const managerAccess = await verifyFormAccess(session.user.id, id, 'manager');
      if (!managerAccess.allowed) {
        return NextResponse.json(
          { error: 'Only managers and owners can change custom URL slugs.' },
          { status: 403 }
        );
      }
    }

    let nextSlug: string | null | undefined = undefined;
    if (slug !== undefined) {
      nextSlug = normalizeSlug(slug);
      if (nextSlug !== existingForm.slug) {
        const validationError = validateSlug(nextSlug, 'Slug');
        if (validationError) {
          return NextResponse.json({ error: validationError }, { status: 400 });
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
        const validationError = validateSlug(nextBookingSlug, 'Booking slug');
        if (validationError) {
          return NextResponse.json({ error: validationError }, { status: 400 });
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

    // A bookingSlug only makes sense if the form actually has a booking field,
    // otherwise the custom-domain resolver would route to BookingPageClient
    // against a form with nothing to render. Check the effective fields
    // (post-update if fields are in this request, otherwise the stored ones).
    if (effectiveBookingSlug) {
      let effectiveFields: Array<{ type?: string }> = [];
      if (fields !== undefined) {
        if (Array.isArray(fields)) {
          effectiveFields = fields as Array<{ type?: string }>;
        }
      } else {
        try {
          const parsed = JSON.parse(existingForm.fields || '[]');
          if (Array.isArray(parsed)) effectiveFields = parsed;
        } catch {
          // treat unparseable fields as empty — validator below will reject
        }
      }
      const hasBookingField = effectiveFields.some((f) => f?.type === 'booking');
      if (!hasBookingField) {
        return NextResponse.json(
          { error: 'Booking slug can only be set on forms that have a booking field' },
          { status: 400 }
        );
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

    // Figure out which (if any) slug values changed so we can (a) preserve
    // the old values as redirects for a grace period and (b) log the change.
    const slugChanged = nextSlug !== undefined && nextSlug !== existingForm.slug;
    const bookingSlugChanged =
      nextBookingSlug !== undefined && nextBookingSlug !== existingForm.bookingSlug;

    const form = await prisma.$transaction(async (tx) => {
      const updated = await tx.form.update({
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

      // If the new slug matches an existing redirect in this workspace (e.g.
      // this form just reclaimed a value that used to belong to another
      // form), remove that stale redirect — the current owner wins.
      const reclaimedValues = [nextSlug, nextBookingSlug].filter(
        (v): v is string => typeof v === 'string' && v.length > 0
      );
      if (reclaimedValues.length > 0) {
        await tx.formSlugRedirect.deleteMany({
          where: { workspaceId: existingForm.workspaceId, slug: { in: reclaimedValues } },
        });
      }

      // Record redirects from the OLD values so external links keep working.
      const redirectRows: Array<{
        workspaceId: string;
        slug: string;
        kind: string;
        formId: string;
        expiresAt: Date;
      }> = [];
      const expiresAt = slugRedirectExpiresAt();
      if (slugChanged && existingForm.slug) {
        redirectRows.push({
          workspaceId: existingForm.workspaceId,
          slug: existingForm.slug,
          kind: 'slug',
          formId: id,
          expiresAt,
        });
      }
      if (bookingSlugChanged && existingForm.bookingSlug) {
        redirectRows.push({
          workspaceId: existingForm.workspaceId,
          slug: existingForm.bookingSlug,
          kind: 'bookingSlug',
          formId: id,
          expiresAt,
        });
      }
      if (redirectRows.length > 0) {
        // upsert-like behaviour: clear any prior redirect for the same
        // (workspaceId, slug) before inserting, so we can't hit the unique
        // index even across forms. The current owner check above handles
        // the case where a live form is claiming the value; here we handle
        // stale redirects with the same key.
        await tx.formSlugRedirect.deleteMany({
          where: {
            workspaceId: existingForm.workspaceId,
            slug: { in: redirectRows.map((r) => r.slug) },
          },
        });
        await tx.formSlugRedirect.createMany({ data: redirectRows });
      }

      return updated;
    });

    // Audit: record any slug change so owners can see who broke (or fixed) a link.
    if (slugChanged || bookingSlugChanged) {
      const ip = getClientIp(request);
      if (slugChanged) {
        auditLog({
          action: 'form.slug_change',
          userId: session.user.id,
          ip,
          resourceType: 'form',
          resourceId: id,
          details: {
            workspaceId: existingForm.workspaceId,
            from: existingForm.slug,
            to: nextSlug,
          },
        });
      }
      if (bookingSlugChanged) {
        auditLog({
          action: 'form.booking_slug_change',
          userId: session.user.id,
          ip,
          resourceType: 'form',
          resourceId: id,
          details: {
            workspaceId: existingForm.workspaceId,
            from: existingForm.bookingSlug,
            to: nextBookingSlug,
          },
        });
      }
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
