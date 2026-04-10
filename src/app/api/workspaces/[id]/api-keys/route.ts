import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyWorkspaceAccess } from '@/lib/workspace-auth';
import { getSubscriptionInfo } from '@/lib/subscription';
import crypto from 'crypto';

// Generate a random API key
function generateApiKey(type: 'live' | 'test' = 'live'): { key: string; prefix: string; hash: string } {
  const randomPart = crypto.randomBytes(24).toString('base64url');
  const prefix = `frm_${type}`;
  const key = `${prefix}_${randomPart}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return { key, prefix, hash };
}

// Hash an API key for lookup
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// GET /api/workspaces/[id]/api-keys - List API keys
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
    const access = await verifyWorkspaceAccess(session.user.id, id, 'manager');

    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { workspaceId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      apiKeys: apiKeys.map((key) => ({
        ...key,
        // Show masked key for display
        maskedKey: `${key.prefix}_${'x'.repeat(20)}`,
      })),
    });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/[id]/api-keys - Create a new API key
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
    const access = await verifyWorkspaceAccess(session.user.id, id, 'manager');

    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    // Check subscription - API access requires Trial or Pro
    const info = await getSubscriptionInfo(id);
    if (!info.features.apiAccess) {
      return NextResponse.json(
        { error: 'API access requires Trial or Pro plan.' },
        { status: 402 }
      );
    }

    const { name, type = 'live' } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { key, prefix, hash } = generateApiKey(type);

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        key: hash, // Store hash, not plaintext
        prefix,
        workspaceId: id,
      },
    });

    // Return the full key only once (on creation) — it's never stored
    return NextResponse.json({
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key, // Full plaintext key shown only on creation
        prefix: apiKey.prefix,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}
