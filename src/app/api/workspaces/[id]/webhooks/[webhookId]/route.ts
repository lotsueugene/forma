import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyWorkspaceAccess } from '@/lib/workspace-auth';
import { getSubscriptionInfo } from '@/lib/subscription';

// PATCH /api/workspaces/[id]/webhooks/[webhookId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; webhookId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, webhookId } = await params;
    const access = await verifyWorkspaceAccess(session.user.id, id, 'manager');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const info = await getSubscriptionInfo(id);
    if (!info.features.webhooks) {
      return NextResponse.json(
        { error: 'Webhooks require Trial or Pro.' },
        { status: 402 }
      );
    }

    const body = (await request.json()) as {
      name?: string;
      url?: string;
      active?: boolean;
      events?: string[];
      rotateSecret?: boolean;
    };

    const existing = await prisma.webhookEndpoint.findUnique({
      where: { id: webhookId },
    });
    if (!existing || existing.workspaceId !== id) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    let url = existing.url;
    if (typeof body.url === 'string') {
      try {
        const parsed = new URL(body.url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return NextResponse.json(
            { error: 'URL must be http or https' },
            { status: 400 }
          );
        }
        url = parsed.toString();
      } catch {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
      }
    }

    const updated = await prisma.webhookEndpoint.update({
      where: { id: webhookId },
      data: {
        name: typeof body.name === 'string' ? body.name.trim() || existing.name : undefined,
        url,
        active: typeof body.active === 'boolean' ? body.active : undefined,
        events: Array.isArray(body.events) && body.events.length > 0
          ? body.events.join(',')
          : undefined,
        secret: body.rotateSecret ? crypto.randomBytes(32).toString('hex') : undefined,
      },
    });

    return NextResponse.json({
      endpoint: {
        ...updated,
        events: updated.events.split(',').map((e) => e.trim()),
      },
    });
  } catch (error) {
    console.error('Error updating webhook:', error);
    return NextResponse.json(
      { error: 'Failed to update webhook endpoint' },
      { status: 500 }
    );
  }
}

// DELETE /api/workspaces/[id]/webhooks/[webhookId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; webhookId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, webhookId } = await params;
    const access = await verifyWorkspaceAccess(session.user.id, id, 'manager');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const existing = await prisma.webhookEndpoint.findUnique({
      where: { id: webhookId },
    });
    if (!existing || existing.workspaceId !== id) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    await prisma.webhookEndpoint.delete({
      where: { id: webhookId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json(
      { error: 'Failed to delete webhook endpoint' },
      { status: 500 }
    );
  }
}

