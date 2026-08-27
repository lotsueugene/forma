import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { deriveEntitlementStatus, revokeEntitlement } from '@/lib/entitlements';
import { getClientIp } from '@/lib/api-rate-limit';

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
    message.includes('Unsupported') || message.includes('Invalid') || message.includes('required') ? 400 :
    500;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
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
      reason?: string;
      internalNote?: string;
      idempotencyKey?: string;
    };

    const result = await revokeEntitlement({
      entitlementId: id,
      actorId: admin.user.id,
      reason: body.reason || '',
      source: 'admin',
      idempotencyKey: body.idempotencyKey || request.headers.get('idempotency-key') || undefined,
      metadata: {
        internalNote: typeof body.internalNote === 'string' ? body.internalNote.slice(0, 1000) : null,
        ip: getClientIp(request),
      },
    });

    return NextResponse.json({
      entitlement: serializeEntitlement(result.entitlement),
      changed: result.changed,
    });
  } catch (error) {
    console.error('Admin entitlement revoke error:', error);
    return toError(error);
  }
}
