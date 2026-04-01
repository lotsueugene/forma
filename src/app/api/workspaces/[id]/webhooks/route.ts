import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyWorkspaceAccess } from '@/lib/workspace-auth';
import { getSubscriptionInfo } from '@/lib/subscription';

// GET /api/workspaces/[id]/webhooks - list webhook endpoints
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
    if (!info.features.webhooks) {
      return NextResponse.json(
        { error: 'Webhooks require Trial or Pro.' },
        { status: 402 }
      );
    }

    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { workspaceId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        active: true,
        lastTriggeredAt: true,
        lastStatusCode: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ endpoints });
  } catch (error) {
    console.error('Error listing webhooks:', error);
    return NextResponse.json(
      { error: 'Failed to list webhooks' },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/[id]/webhooks - create webhook endpoint
export async function POST(
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
    if (!info.features.webhooks) {
      return NextResponse.json(
        { error: 'Webhooks require Trial or Pro.' },
        { status: 402 }
      );
    }

    const body = (await request.json()) as {
      name?: string;
      url?: string;
      events?: string[];
    };

    if (!body.url || typeof body.url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(body.url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json(
        { error: 'URL must be http or https' },
        { status: 400 }
      );
    }

    const events = Array.isArray(body.events) && body.events.length > 0
      ? body.events
      : ['submission.created'];

    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        workspaceId: id,
        name: body.name?.trim() || `Webhook ${parsed.hostname}`,
        url: parsed.toString(),
        secret: crypto.randomBytes(32).toString('hex'),
        events: events.join(','),
        active: true,
      },
    });

    return NextResponse.json({
      endpoint: {
        ...endpoint,
        events,
      },
    });
  } catch (error) {
    console.error('Error creating webhook:', error);
    return NextResponse.json(
      { error: 'Failed to create webhook endpoint' },
      { status: 500 }
    );
  }
}

