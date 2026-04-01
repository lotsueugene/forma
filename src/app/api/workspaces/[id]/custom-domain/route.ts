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
    const access = await verifyWorkspaceAccess(session.user.id, id, 'admin');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const info = await getSubscriptionInfo(id);
    const domain = await prisma.customDomain.findUnique({
      where: { workspaceId: id },
    });

    return NextResponse.json({
      featureEnabled: info.features.customDomain,
      domain,
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
    const access = await verifyWorkspaceAccess(session.user.id, id, 'admin');
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
    const access = await verifyWorkspaceAccess(session.user.id, id, 'admin');
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

