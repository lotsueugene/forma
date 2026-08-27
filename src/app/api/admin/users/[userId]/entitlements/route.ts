import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/admin-auth';
import {
  deriveEntitlementStatus,
  grantEntitlement,
  getEntitlementHistory,
  getEntitlementSummary,
  type EntitlementSource,
  type EntitlementType,
} from '@/lib/entitlements';
import { getClientIp } from '@/lib/api-rate-limit';

const PRESETS: Record<string, { days?: number; months?: number; years?: number }> = {
  '1d': { days: 1 },
  '3d': { days: 3 },
  '7d': { days: 7 },
  '14d': { days: 14 },
  '30d': { days: 30 },
  '3mo': { months: 3 },
  '6mo': { months: 6 },
  '1y': { years: 1 },
};

function addDuration(date: Date, preset: keyof typeof PRESETS) {
  const next = new Date(date);
  const config = PRESETS[preset];
  if (config.days) next.setDate(next.getDate() + config.days);
  if (config.months) next.setMonth(next.getMonth() + config.months);
  if (config.years) next.setFullYear(next.getFullYear() + config.years);
  return next;
}

function parseDate(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} is required`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field} is invalid`);
  }
  return date;
}

function endOfDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T23:59:59.999`);
  }
  return new Date(value);
}

function parseJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
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
}, actors: Map<string, { id: string; name: string | null; email: string | null }>) {
  const grantedByUser = row.grantedBy ? actors.get(row.grantedBy) ?? null : null;
  const revokedByUser = row.revokedBy ? actors.get(row.revokedBy) ?? null : null;
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
    grantedByUser,
    grantReason: row.grantReason,
    source: row.source,
    metadata: parseJson(row.metadata),
    revokedAt: row.revokedAt?.toISOString() ?? null,
    revokedBy: row.revokedBy,
    revokedByUser,
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [summary, history, events] = await Promise.all([
      getEntitlementSummary(userId, 'premium'),
      getEntitlementHistory(userId, 'premium'),
      prisma.entitlementEvent.findMany({
        where: { userId, type: { startsWith: 'entitlement.' } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const actorIds = new Set<string>();
    for (const entitlement of history.entitlements) {
      if (entitlement.grantedBy) actorIds.add(entitlement.grantedBy);
      if (entitlement.revokedBy) actorIds.add(entitlement.revokedBy);
    }
    for (const audit of history.audits) {
      if (audit.actorId) actorIds.add(audit.actorId);
    }

    const actors = actorIds.size > 0
      ? await prisma.user.findMany({
          where: { id: { in: Array.from(actorIds) } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const actorMap = new Map(actors.map((actor) => [actor.id, actor]));
    const explicitExpired = new Set(
      history.audits
        .filter((audit) => audit.action === 'expired' && audit.entitlementId)
        .map((audit) => audit.entitlementId!)
    );

    const auditHistory = history.audits.map((audit) => ({
      id: audit.id,
      entitlementId: audit.entitlementId,
      action: audit.action,
      actorId: audit.actorId,
      actor: audit.actorId ? actorMap.get(audit.actorId) ?? null : null,
      source: audit.source,
      reason: audit.reason,
      previousValue: parseJson(audit.previousValue),
      newValue: parseJson(audit.newValue),
      metadata: parseJson(audit.metadata),
      createdAt: audit.createdAt.toISOString(),
    }));

    for (const entitlement of history.entitlements) {
      if (
        entitlement.expiresAt &&
        deriveEntitlementStatus(entitlement) === 'expired' &&
        !explicitExpired.has(entitlement.id)
      ) {
        auditHistory.push({
          id: `synthetic-expired-${entitlement.id}`,
          entitlementId: entitlement.id,
          action: 'expired',
          actorId: null,
          actor: null,
          source: 'system',
          reason: 'Entitlement expiration timestamp passed',
          previousValue: null,
          newValue: { status: 'expired' },
          metadata: null,
          createdAt: entitlement.expiresAt.toISOString(),
        });
      }
    }

    auditHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
      },
      premium: {
        active: summary.active,
        entitlementId: summary.entitlementId,
        startsAt: summary.startsAt?.toISOString() ?? null,
        expiresAt: summary.expiresAt?.toISOString() ?? null,
        status: summary.status,
        source: summary.source,
        reason: summary.reason,
      },
      entitlements: history.entitlements.map((row) => serializeEntitlement(row, actorMap)),
      history: auditHistory,
      events: events.map((event) => ({
        id: event.id,
        entitlementId: event.entitlementId,
        type: event.type,
        status: event.status,
        attempts: event.attempts,
        lastError: event.lastError,
        processedAt: event.processedAt?.toISOString() ?? null,
        createdAt: event.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Admin user entitlement GET error:', error);
    return toError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      type?: string;
      preset?: string;
      startsAt?: string;
      expiresAt?: string | null;
      reason?: string;
      internalNote?: string;
      source?: string;
      idempotencyKey?: string;
    };

    const type = (body.type || 'premium') as EntitlementType;
    const source = (body.source || 'admin') as EntitlementSource;
    const preset = body.preset || '7d';
    const startsAt = body.startsAt ? parseDate(body.startsAt, 'startsAt') : new Date();
    let expiresAt: Date | null = null;
    let stackWithActive = false;

    if (preset === 'permanent') {
      expiresAt = null;
    } else if (preset === 'custom') {
      expiresAt = endOfDate(String(body.expiresAt || ''));
      if (Number.isNaN(expiresAt.getTime())) {
        throw new Error('expiresAt is invalid');
      }
    } else if (preset in PRESETS) {
      expiresAt = addDuration(startsAt, preset as keyof typeof PRESETS);
      stackWithActive = true;
    } else if (body.expiresAt) {
      expiresAt = parseDate(body.expiresAt, 'expiresAt');
    } else {
      throw new Error('Invalid entitlement duration');
    }

    const idempotencyKey =
      body.idempotencyKey ||
      request.headers.get('idempotency-key') ||
      undefined;

    const result = await grantEntitlement({
      userId,
      type,
      startsAt,
      expiresAt,
      grantedBy: admin.user.id,
      reason: body.reason || '',
      source,
      idempotencyKey,
      stackWithActive,
      metadata: {
        preset,
        internalNote: typeof body.internalNote === 'string' ? body.internalNote.slice(0, 1000) : null,
        requestedExpiresAt: body.expiresAt ?? null,
        ip: getClientIp(request),
      },
    });

    return NextResponse.json(
      {
        entitlement: serializeEntitlement(result.entitlement, new Map([[admin.user.id, {
          id: admin.user.id,
          name: admin.user.name,
          email: admin.user.email,
        }]])),
        created: result.created,
      },
      { status: result.created ? 201 : 200 }
    );
  } catch (error) {
    console.error('Admin user entitlement POST error:', error);
    return toError(error);
  }
}
