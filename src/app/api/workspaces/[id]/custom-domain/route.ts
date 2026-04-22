import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyWorkspaceAccess } from '@/lib/workspace-auth';
import { getSubscriptionInfo } from '@/lib/subscription';

// GET /api/workspaces/[id]/custom-domain
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    // Allow any workspace member to view custom domain status
    const access = await verifyWorkspaceAccess(session.user.id, id, 'viewer');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const info = await getSubscriptionInfo(id);
    const domain = await prisma.customDomain.findUnique({
      where: { workspaceId: id },
      include: {
        defaultForm: {
          select: { id: true, name: true, slug: true, bookingSlug: true },
        },
      },
    });

    // Get list of active forms for the default form selector.
    // Derive hasBookingField server-side so the UI can mark forms that expose a booking URL
    // without shipping the full form field definitions to the client.
    const rawForms = await prisma.form.findMany({
      where: { workspaceId: id, status: 'active' },
      select: { id: true, name: true, slug: true, bookingSlug: true, fields: true },
      orderBy: { name: 'asc' },
    });
    const forms = rawForms.map((f) => {
      let hasBookingField = false;
      try {
        const parsed = JSON.parse(f.fields || '[]');
        if (Array.isArray(parsed)) {
          hasBookingField = parsed.some((field: { type?: string }) => field?.type === 'booking');
        }
      } catch {
        // ignore malformed field JSON
      }
      return {
        id: f.id,
        name: f.name,
        slug: f.slug,
        bookingSlug: f.bookingSlug,
        hasBookingField,
      };
    });

    return NextResponse.json({
      featureEnabled: info.features.customDomain,
      domain,
      forms,
    });
  } catch (error) {
    console.error('Error fetching custom domain:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom domain' },
      { status: 500 }
    );
  }
}

// PUT /api/workspaces/[id]/custom-domain
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const access = await verifyWorkspaceAccess(session.user.id, id, 'manager');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const info = await getSubscriptionInfo(id);
    if (!info.features.customDomain) {
      return NextResponse.json(
        { error: 'Custom domain requires Pro plan.' },
        { status: 402 }
      );
    }

    const body = (await request.json()) as { domain?: string };
    const domain = (body.domain || '').trim().toLowerCase();
    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    // Very basic domain validation
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
      return NextResponse.json({ error: 'Invalid domain' }, { status: 400 });
    }

    const verificationToken = crypto.randomBytes(16).toString('hex');

    const saved = await prisma.customDomain.upsert({
      where: { workspaceId: id },
      update: {
        domain,
        verificationToken,
        verifiedAt: null,
        status: 'pending',
      },
      create: {
        workspaceId: id,
        domain,
        verificationToken,
        status: 'pending',
      },
    });

    return NextResponse.json({ domain: saved });
  } catch (error) {
    console.error('Error saving custom domain:', error);
    return NextResponse.json(
      { error: 'Failed to save custom domain' },
      { status: 500 }
    );
  }
}

// PATCH /api/workspaces/[id]/custom-domain - Update default form
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const access = await verifyWorkspaceAccess(session.user.id, id, 'manager');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const body = (await request.json()) as { defaultFormId?: string | null };

    // Verify form belongs to workspace if provided
    if (body.defaultFormId) {
      const form = await prisma.form.findFirst({
        where: {
          id: body.defaultFormId,
          workspaceId: id,
          status: 'active',
        },
      });
      if (!form) {
        return NextResponse.json({ error: 'Form not found or not active' }, { status: 404 });
      }
    }

    const updated = await prisma.customDomain.update({
      where: { workspaceId: id },
      data: {
        defaultFormId: body.defaultFormId || null,
      },
      include: {
        defaultForm: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return NextResponse.json({ domain: updated });
  } catch (error) {
    console.error('Error updating custom domain:', error);
    return NextResponse.json(
      { error: 'Failed to update custom domain' },
      { status: 500 }
    );
  }
}

// DELETE /api/workspaces/[id]/custom-domain
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const access = await verifyWorkspaceAccess(session.user.id, id, 'manager');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    await prisma.customDomain.deleteMany({
      where: { workspaceId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom domain:', error);
    return NextResponse.json(
      { error: 'Failed to delete custom domain' },
      { status: 500 }
    );
  }
}

