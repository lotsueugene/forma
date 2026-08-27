import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import {
  deriveEntitlementStatus,
  extendEntitlement,
  type EntitlementDuration,
} from '@/lib/entitlements';
import { getClientIp } from '@/lib/api-rate-limit';

const PRESETS: Record<string, EntitlementDuration> = {
  '1d': { days: 1 },
  '3d': { days: 3 },
  '7d': { days: 7 },
  '14d': { days: 14 },
  '30d': { days: 30 },
  '3mo': { months: 3 },
  '6mo': { months: 6 },
  '1y': { years: 1 },
};

function endOfDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T23:59:59.999`);
  }
  return new Date(value);
}

function serializeEntitlement(row: {
  id: string;
  userId: string;
  type: string;
  status: string;
  startsAt: Date;
  expiresAt: Date | null;
  grantedAt: Date;
  grantedBy: string | null;
  grantReason: string;
  source: string;
  metadata: string | null;
  revokedAt: Date | null;
  revokedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    status: deriveEntitlementStatus(row),
    storedStatus: row.status,
    startsAt: row.startsAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    grantedAt: row.grantedAt.toISOString(),
    grantedBy: row.grantedBy,
    grantReason: row.grantReason,
    source: row.source,
    metadata: row.metadata,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    revokedBy: row.revokedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Entitlement request failed';
  const status =
    message.includes('not found') || message.includes('Not found') ? 404 :
    message.includes('Unsupported') || message.includes('Invalid') || message.includes('required') || message.includes('duration') ? 400 :
    500;
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      preset?: string;
      expiresAt?: string;
      reason?: string;
      internalNote?: string;
      idempotencyKey?: string;
    };

    const preset = body.preset || '7d';
    const data: {
      expiresAt?: Date;
      duration?: EntitlementDuration;
    } = {};

    if (preset === 'custom') {
      const expiresAt = endOfDate(String(body.expiresAt || ''));
      if (Number.isNaN(expiresAt.getTime())) {
        throw new Error('expiresAt is invalid');
      }
      data.expiresAt = expiresAt;
    } else if (preset in PRESETS) {
      data.duration = PRESETS[preset];
    } else {
      throw new Error('Invalid extension duration');
    }

    const result = await extendEntitlement({
      entitlementId: id,
      actorId: admin.user.id,
      reason: body.reason || '',
      source: 'admin',
      idempotencyKey: body.idempotencyKey || request.headers.get('idempotency-key') || undefined,
      metadata: {
        preset,
        requestedExpiresAt: body.expiresAt ?? null,
        internalNote: typeof body.internalNote === 'string' ? body.internalNote.slice(0, 1000) : null,
        ip: getClientIp(request),
      },
      ...data,
    });

    return NextResponse.json({
      entitlement: serializeEntitlement(result.entitlement),
      changed: result.changed,
    });
  } catch (error) {
    console.error('Admin entitlement PATCH error:', error);
    return toError(error);
  }
}
