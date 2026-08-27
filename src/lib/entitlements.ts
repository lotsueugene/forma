import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { auditLog } from './audit';
import { processEntitlementEvent } from './entitlement-events';

export const ENTITLEMENT_TYPES = ['premium'] as const;
export const ENTITLEMENT_SOURCES = [
  'admin',
  'signup_promotion',
  'referral',
  'support',
  'system',
  'other',
] as const;

export type EntitlementType = typeof ENTITLEMENT_TYPES[number];
export type EntitlementSource = typeof ENTITLEMENT_SOURCES[number];
export type EntitlementStatus = 'active' | 'expired' | 'revoked' | 'scheduled';
export type EntitlementAuditAction = 'granted' | 'extended' | 'revoked' | 'expired';
export interface EntitlementDuration {
  days?: number;
  months?: number;
  years?: number;
}

type EntitlementRow = Awaited<ReturnType<typeof prisma.entitlement.findFirst>>;
type Entitlement = NonNullable<EntitlementRow>;
type Tx = Prisma.TransactionClient;

export interface EntitlementSummary {
  active: boolean;
  entitlementId: string | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  status: EntitlementStatus;
  source: string | null;
  reason: string | null;
}

export interface GrantEntitlementInput {
  userId: string;
  type: EntitlementType;
  startsAt?: Date;
  expiresAt?: Date | null;
  grantedBy?: string | null;
  reason: string;
  source: EntitlementSource;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
  /**
   * Duration grants should pass true. If the user already has a finite active
   * entitlement, the requested duration is appended to that latest end date.
   * Custom date/permanent grants should pass false so they create independent
   * historical grants without shortening access.
   */
  stackWithActive?: boolean;
}

export interface ExtendEntitlementInput {
  entitlementId: string;
  actorId: string;
  reason: string;
  source?: EntitlementSource;
  expiresAt?: Date;
  duration?: EntitlementDuration;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface RevokeEntitlementInput {
  entitlementId: string;
  actorId: string;
  reason: string;
  source?: EntitlementSource;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

function isKnownRequestError(error: unknown, code: string) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === code
  );
}

function validateEntitlementType(type: string): asserts type is EntitlementType {
  if (!ENTITLEMENT_TYPES.includes(type as EntitlementType)) {
    throw new Error(`Unsupported entitlement type: ${type}`);
  }
}

function validateEntitlementSource(source: string): asserts source is EntitlementSource {
  if (!ENTITLEMENT_SOURCES.includes(source as EntitlementSource)) {
    throw new Error(`Unsupported entitlement source: ${source}`);
  }
}

function cleanReason(reason: string) {
  const value = reason.trim();
  if (!value) throw new Error('A grant reason is required');
  if (value.length > 500) throw new Error('Reason must be 500 characters or less');
  return value;
}

function serialize(value: unknown) {
  return JSON.stringify(value ?? null);
}

function metadataToString(metadata?: Record<string, unknown>) {
  return metadata && Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null;
}

export function deriveEntitlementStatus(
  entitlement: Pick<Entitlement, 'startsAt' | 'expiresAt' | 'revokedAt'>,
  now = new Date()
): EntitlementStatus {
  if (entitlement.revokedAt) return 'revoked';
  if (entitlement.startsAt > now) return 'scheduled';
  if (entitlement.expiresAt && entitlement.expiresAt <= now) return 'expired';
  return 'active';
}

export function isEntitlementValidAt(
  entitlement: Pick<Entitlement, 'startsAt' | 'expiresAt' | 'revokedAt'>,
  now = new Date()
) {
  return (
    entitlement.startsAt <= now &&
    (!entitlement.expiresAt || entitlement.expiresAt > now) &&
    !entitlement.revokedAt
  );
}

function ensureDateRange(startsAt: Date, expiresAt: Date | null) {
  if (Number.isNaN(startsAt.getTime())) {
    throw new Error('Invalid start date');
  }
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    throw new Error('Invalid expiration date');
  }
  if (expiresAt && expiresAt <= startsAt) {
    throw new Error('Expiration must be after the start date');
  }
}

export function addEntitlementDuration(base: Date, duration: EntitlementDuration) {
  const next = new Date(base);
  if (duration.days) next.setDate(next.getDate() + duration.days);
  if (duration.months) next.setMonth(next.getMonth() + duration.months);
  if (duration.years) next.setFullYear(next.getFullYear() + duration.years);
  return next;
}

export function calculateStackedGrantWindow(input: {
  requestedStartsAt: Date;
  requestedExpiresAt: Date | null;
  latestFiniteAccessEnd?: Date | null;
  stackWithActive?: boolean;
}) {
  const { requestedStartsAt, requestedExpiresAt, latestFiniteAccessEnd, stackWithActive } = input;
  if (!stackWithActive || !requestedExpiresAt || !latestFiniteAccessEnd || latestFiniteAccessEnd <= requestedStartsAt) {
    return {
      startsAt: requestedStartsAt,
      expiresAt: requestedExpiresAt,
      stacked: false,
    };
  }

  const durationMs = requestedExpiresAt.getTime() - requestedStartsAt.getTime();
  return {
    startsAt: latestFiniteAccessEnd,
    expiresAt: new Date(latestFiniteAccessEnd.getTime() + durationMs),
    stacked: true,
  };
}

async function getLatestFiniteAccessEnd(
  tx: Tx,
  userId: string,
  type: EntitlementType,
  now: Date
) {
  const rows = await tx.entitlement.findMany({
    where: {
      userId,
      type,
      revokedAt: null,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    select: { startsAt: true, expiresAt: true },
  });

  if (rows.some((row) => row.expiresAt == null && row.startsAt <= now)) {
    return { permanent: true, latestEnd: null as Date | null };
  }

  let latestEnd: Date | null = null;
  for (const row of rows) {
    if (!row.expiresAt) continue;
    if (!latestEnd || row.expiresAt > latestEnd) {
      latestEnd = row.expiresAt;
    }
  }

  return { permanent: false, latestEnd };
}

async function createEntitlementEvent(
  tx: Tx,
  input: {
    type: 'entitlement.granted' | 'entitlement.extended' | 'entitlement.revoked' | 'entitlement.expired';
    entitlementId: string;
    userId: string;
    entitlementType: EntitlementType;
    startsAt: Date;
    expiresAt: Date | null;
    source: EntitlementSource;
    reason?: string | null;
    actorId?: string | null;
    operationKey?: string | null;
  }
) {
  const idempotencyKey = input.operationKey
    ? `${input.type}:${input.entitlementId}:${input.operationKey}`
    : `${input.type}:${input.entitlementId}`;
  const payload = {
    entitlementId: input.entitlementId,
    userId: input.userId,
    type: input.entitlementType,
    startsAt: input.startsAt.toISOString(),
    expiresAt: input.expiresAt ? input.expiresAt.toISOString() : null,
    source: input.source,
    reason: input.reason ?? null,
    actorId: input.actorId ?? null,
  };

  const event = await tx.entitlementEvent.upsert({
    where: {
      idempotencyKey,
    },
    update: {},
    create: {
      entitlementId: input.entitlementId,
      userId: input.userId,
      type: input.type,
      payload: JSON.stringify(payload),
      idempotencyKey,
    },
    select: { id: true },
  });

  return event.id;
}

function processEventSoon(eventId: string | null) {
  if (!eventId) return;
  processEntitlementEvent(eventId).catch((error) => {
    console.error('[Entitlements] Failed to process entitlement event:', error);
  });
}

async function findEntitlementByAuditIdempotencyKey(idempotencyKey: string) {
  const audit = await prisma.entitlementAuditLog.findUnique({
    where: { idempotencyKey },
    select: { entitlementId: true },
  });
  if (!audit?.entitlementId) return null;
  return prisma.entitlement.findUnique({
    where: { id: audit.entitlementId },
  });
}

export async function grantEntitlement(input: GrantEntitlementInput) {
  validateEntitlementType(input.type);
  validateEntitlementSource(input.source);

  const reason = cleanReason(input.reason);
  const now = new Date();
  const requestedStartsAt = input.startsAt ?? now;
  const requestedExpiresAt = input.expiresAt ?? null;
  ensureDateRange(requestedStartsAt, requestedExpiresAt);

  let eventId: string | null = null;
  let created = false;

  try {
    const entitlement = await prisma.$transaction(async (tx) => {
      if (input.idempotencyKey) {
        const existing = await tx.entitlement.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
        });
        if (existing) return existing;
      }

      const user = await tx.user.findUnique({
        where: { id: input.userId },
        select: { id: true },
      });
      if (!user) throw new Error('User not found');

      let startsAt = requestedStartsAt;
      let expiresAt = requestedExpiresAt;
      const metadata = { ...(input.metadata ?? {}) };

      if (input.stackWithActive && requestedExpiresAt) {
        const current = await getLatestFiniteAccessEnd(tx, input.userId, input.type, now);
        const stacked = calculateStackedGrantWindow({
          requestedStartsAt,
          requestedExpiresAt,
          latestFiniteAccessEnd: current.permanent ? null : current.latestEnd,
          stackWithActive: true,
        });
        startsAt = stacked.startsAt;
        expiresAt = stacked.expiresAt;
        if (stacked.stacked) {
          metadata.requestedStartsAt = requestedStartsAt.toISOString();
          metadata.requestedExpiresAt = requestedExpiresAt.toISOString();
          metadata.stackedFrom = startsAt.toISOString();
        }
      }

      const status = deriveEntitlementStatus({ startsAt, expiresAt, revokedAt: null }, now);
      const createdEntitlement = await tx.entitlement.create({
        data: {
          userId: input.userId,
          type: input.type,
          status,
          startsAt,
          expiresAt,
          grantedAt: now,
          grantedBy: input.grantedBy ?? null,
          grantReason: reason,
          source: input.source,
          metadata: metadataToString(metadata),
          idempotencyKey: input.idempotencyKey ?? null,
        },
      });

      await tx.entitlementAuditLog.create({
        data: {
          entitlementId: createdEntitlement.id,
          userId: input.userId,
          action: 'granted',
          actorId: input.grantedBy ?? null,
          source: input.source,
          reason,
          previousValue: null,
          newValue: serialize({
            type: createdEntitlement.type,
            startsAt: createdEntitlement.startsAt,
            expiresAt: createdEntitlement.expiresAt,
            status: createdEntitlement.status,
          }),
          metadata: metadataToString(metadata),
          idempotencyKey: input.idempotencyKey ? `audit:${input.idempotencyKey}` : null,
        },
      });

      eventId = await createEntitlementEvent(tx, {
        type: 'entitlement.granted',
        entitlementId: createdEntitlement.id,
        userId: input.userId,
        entitlementType: input.type,
        startsAt: createdEntitlement.startsAt,
        expiresAt: createdEntitlement.expiresAt,
        source: input.source,
        reason,
        actorId: input.grantedBy ?? null,
      });

      created = true;
      return createdEntitlement;
    });

    if (created) {
      auditLog({
        action: 'entitlement.granted',
        userId: input.grantedBy ?? input.userId,
        resourceType: 'entitlement',
        resourceId: entitlement.id,
        details: {
          targetUserId: input.userId,
          type: input.type,
          startsAt: entitlement.startsAt.toISOString(),
          expiresAt: entitlement.expiresAt?.toISOString() ?? null,
          source: input.source,
          reason,
        },
      });
    }

    processEventSoon(eventId);
    return { entitlement, created };
  } catch (error) {
    if (input.idempotencyKey && isKnownRequestError(error, 'P2002')) {
      const entitlement = await prisma.entitlement.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (entitlement) return { entitlement, created: false };
    }
    throw error;
  }
}

export async function revokeEntitlement(input: RevokeEntitlementInput) {
  const reason = cleanReason(input.reason);
  const source = input.source ?? 'admin';
  validateEntitlementSource(source);

  let eventId: string | null = null;
  let changed = false;

  try {
    const entitlement = await prisma.$transaction(async (tx) => {
    if (input.idempotencyKey) {
      const existingAudit = await tx.entitlementAuditLog.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existingAudit?.entitlementId) {
        const existing = await tx.entitlement.findUnique({
          where: { id: existingAudit.entitlementId },
        });
        if (existing) return existing;
      }
    }

    const existing = await tx.entitlement.findUnique({
      where: { id: input.entitlementId },
    });
    if (!existing) throw new Error('Entitlement not found');

    validateEntitlementType(existing.type);

    if (existing.revokedAt) {
      return existing;
    }

    const revokedAt = new Date();
    const updated = await tx.entitlement.update({
      where: { id: existing.id },
      data: {
        status: 'revoked',
        revokedAt,
        revokedBy: input.actorId,
      },
    });

    const audit = await tx.entitlementAuditLog.create({
      data: {
        entitlementId: updated.id,
        userId: updated.userId,
        action: 'revoked',
        actorId: input.actorId,
        source,
        reason,
        previousValue: serialize({
          status: existing.status,
          revokedAt: existing.revokedAt,
          revokedBy: existing.revokedBy,
        }),
        newValue: serialize({
          status: updated.status,
          revokedAt: updated.revokedAt,
          revokedBy: updated.revokedBy,
        }),
        metadata: metadataToString(input.metadata),
        idempotencyKey: input.idempotencyKey ?? null,
      },
      select: { id: true },
    });

    eventId = await createEntitlementEvent(tx, {
      type: 'entitlement.revoked',
      entitlementId: updated.id,
      userId: updated.userId,
      entitlementType: updated.type as EntitlementType,
      startsAt: updated.startsAt,
      expiresAt: updated.expiresAt,
      source,
      reason,
      actorId: input.actorId,
      operationKey: input.idempotencyKey ?? audit.id,
    });

    changed = true;
    return updated;
    });

    if (changed) {
      auditLog({
        action: 'entitlement.revoked',
        userId: input.actorId,
        resourceType: 'entitlement',
        resourceId: entitlement.id,
        details: {
          targetUserId: entitlement.userId,
          type: entitlement.type,
          reason,
        },
      });
    }

    processEventSoon(eventId);
    return { entitlement, changed };
  } catch (error) {
    if (input.idempotencyKey && isKnownRequestError(error, 'P2002')) {
      const entitlement = await findEntitlementByAuditIdempotencyKey(input.idempotencyKey);
      if (entitlement) return { entitlement, changed: false };
    }
    throw error;
  }
}

export async function extendEntitlement(input: ExtendEntitlementInput) {
  const reason = cleanReason(input.reason);
  const source = input.source ?? 'admin';
  validateEntitlementSource(source);

  if (!input.expiresAt && !input.duration && !input.durationMs) {
    throw new Error('Provide either expiresAt or a duration');
  }
  if (input.durationMs !== undefined && (!Number.isFinite(input.durationMs) || input.durationMs <= 0)) {
    throw new Error('Extension duration must be positive');
  }
  if (input.duration) {
    const total = (input.duration.days ?? 0) + (input.duration.months ?? 0) + (input.duration.years ?? 0);
    if (total <= 0) throw new Error('Extension duration must be positive');
  }
  if (input.expiresAt && Number.isNaN(input.expiresAt.getTime())) {
    throw new Error('Invalid expiration date');
  }

  let eventId: string | null = null;
  let changed = false;

  try {
    const entitlement = await prisma.$transaction(async (tx) => {
    if (input.idempotencyKey) {
      const existingAudit = await tx.entitlementAuditLog.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existingAudit?.entitlementId) {
        const existing = await tx.entitlement.findUnique({
          where: { id: existingAudit.entitlementId },
        });
        if (existing) return existing;
      }
    }

    const existing = await tx.entitlement.findUnique({
      where: { id: input.entitlementId },
    });
    if (!existing) throw new Error('Entitlement not found');
    validateEntitlementType(existing.type);
    if (existing.revokedAt) throw new Error('Revoked entitlements cannot be extended');
    if (existing.expiresAt == null && !input.expiresAt) return existing;

    const now = new Date();
    const base = existing.expiresAt && existing.expiresAt > now ? existing.expiresAt : now;
    let expiresAt = input.duration
      ? addEntitlementDuration(base, input.duration)
      : input.durationMs
      ? new Date(base.getTime() + input.durationMs)
      : input.expiresAt!;

    if (existing.expiresAt && input.expiresAt && input.expiresAt <= existing.expiresAt) {
      expiresAt = existing.expiresAt;
    }
    if (expiresAt <= existing.startsAt) {
      throw new Error('Expiration must be after the entitlement start date');
    }

    if (existing.expiresAt?.getTime() === expiresAt.getTime()) {
      return existing;
    }

    const status = deriveEntitlementStatus({
      startsAt: existing.startsAt,
      expiresAt,
      revokedAt: existing.revokedAt,
    }, now);

    const updated = await tx.entitlement.update({
      where: { id: existing.id },
      data: { expiresAt, status },
    });

    const audit = await tx.entitlementAuditLog.create({
      data: {
        entitlementId: updated.id,
        userId: updated.userId,
        action: 'extended',
        actorId: input.actorId,
        source,
        reason,
        previousValue: serialize({
          expiresAt: existing.expiresAt,
          status: existing.status,
        }),
        newValue: serialize({
          expiresAt: updated.expiresAt,
          status: updated.status,
        }),
        metadata: metadataToString(input.metadata),
        idempotencyKey: input.idempotencyKey ?? null,
      },
      select: { id: true },
    });

    eventId = await createEntitlementEvent(tx, {
      type: 'entitlement.extended',
      entitlementId: updated.id,
      userId: updated.userId,
      entitlementType: updated.type as EntitlementType,
      startsAt: updated.startsAt,
      expiresAt: updated.expiresAt,
      source,
      reason,
      actorId: input.actorId,
      operationKey: input.idempotencyKey ?? audit.id,
    });

    changed = true;
    return updated;
    });

    if (changed) {
      auditLog({
        action: 'entitlement.extended',
        userId: input.actorId,
        resourceType: 'entitlement',
        resourceId: entitlement.id,
        details: {
          targetUserId: entitlement.userId,
          type: entitlement.type,
          expiresAt: entitlement.expiresAt?.toISOString() ?? null,
          reason,
        },
      });
    }

    processEventSoon(eventId);
    return { entitlement, changed };
  } catch (error) {
    if (input.idempotencyKey && isKnownRequestError(error, 'P2002')) {
      const entitlement = await findEntitlementByAuditIdempotencyKey(input.idempotencyKey);
      if (entitlement) return { entitlement, changed: false };
    }
    throw error;
  }
}

export async function getActiveEntitlements(
  userId: string,
  type?: EntitlementType,
  now = new Date()
) {
  if (type) validateEntitlementType(type);

  return prisma.entitlement.findMany({
    where: {
      userId,
      ...(type ? { type } : {}),
      startsAt: { lte: now },
      revokedAt: null,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    orderBy: [
      { expiresAt: 'desc' },
      { startsAt: 'desc' },
    ],
  });
}

export async function hasEntitlement(
  userId: string,
  type: EntitlementType,
  now = new Date()
) {
  validateEntitlementType(type);
  const row = await prisma.entitlement.findFirst({
    where: {
      userId,
      type,
      startsAt: { lte: now },
      revokedAt: null,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    select: { id: true },
  });

  return !!row;
}

export async function getEntitlementSummary(
  userId: string,
  type: EntitlementType = 'premium',
  now = new Date()
): Promise<EntitlementSummary> {
  validateEntitlementType(type);
  const rows = await prisma.entitlement.findMany({
    where: {
      userId,
      type,
      revokedAt: null,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    orderBy: [
      { startsAt: 'asc' },
      { createdAt: 'asc' },
    ],
  });

  const activeRows = rows.filter((row) => isEntitlementValidAt(row, now));
  if (activeRows.length > 0) {
    const permanent = activeRows.find((row) => row.expiresAt == null);
    const effective = permanent ?? activeRows.reduce((latest, row) => {
      if (!latest.expiresAt) return latest;
      if (!row.expiresAt) return row;
      return row.expiresAt > latest.expiresAt ? row : latest;
    });
    const startsAt = activeRows.reduce(
      (earliest, row) => (row.startsAt < earliest ? row.startsAt : earliest),
      activeRows[0]!.startsAt
    );

    return {
      active: true,
      entitlementId: effective.id,
      startsAt,
      expiresAt: permanent ? null : effective.expiresAt,
      status: 'active',
      source: effective.source,
      reason: effective.grantReason,
    };
  }

  const scheduled = rows
    .filter((row) => row.startsAt > now)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];

  if (scheduled) {
    return {
      active: false,
      entitlementId: scheduled.id,
      startsAt: scheduled.startsAt,
      expiresAt: scheduled.expiresAt,
      status: 'scheduled',
      source: scheduled.source,
      reason: scheduled.grantReason,
    };
  }

  return {
    active: false,
    entitlementId: null,
    startsAt: null,
    expiresAt: null,
    status: 'expired',
    source: null,
    reason: null,
  };
}

export async function getEntitlementHistory(userId: string, type?: EntitlementType) {
  if (type) validateEntitlementType(type);
  const [entitlements, auditRows] = await Promise.all([
    prisma.entitlement.findMany({
      where: {
        userId,
        ...(type ? { type } : {}),
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.entitlementAuditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const typeEntitlementIds = new Set(entitlements.map((row) => row.id));
  const audits = type
    ? auditRows.filter((row) => !row.entitlementId || typeEntitlementIds.has(row.entitlementId))
    : auditRows;

  return {
    entitlements,
    audits,
  };
}

export async function syncExpiredEntitlements(now = new Date(), limit = 100) {
  const rows = await prisma.entitlement.findMany({
    where: {
      revokedAt: null,
      expiresAt: { lte: now },
      status: { not: 'expired' },
    },
    take: limit,
    orderBy: { expiresAt: 'asc' },
  });

  const eventIds: string[] = [];
  for (const row of rows) {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.entitlement.findUnique({ where: { id: row.id } });
      if (!current || current.revokedAt || !current.expiresAt || current.expiresAt > now) {
        return null;
      }
      if (current.status === 'expired') return null;

      const entitlement = await tx.entitlement.update({
        where: { id: current.id },
        data: { status: 'expired' },
      });

      await tx.entitlementAuditLog.create({
        data: {
          entitlementId: entitlement.id,
          userId: entitlement.userId,
          action: 'expired',
          actorId: null,
          source: 'system',
          reason: 'Entitlement expiration timestamp passed',
          previousValue: serialize({ status: current.status }),
          newValue: serialize({ status: 'expired' }),
        },
      });

      const eventId = await createEntitlementEvent(tx, {
        type: 'entitlement.expired',
        entitlementId: entitlement.id,
        userId: entitlement.userId,
        entitlementType: entitlement.type as EntitlementType,
        startsAt: entitlement.startsAt,
        expiresAt: entitlement.expiresAt,
        source: 'system',
        reason: 'Entitlement expired',
      });

      return { entitlement, eventId };
    });

    if (updated) {
      eventIds.push(updated.eventId);
    }
  }

  for (const eventId of eventIds) {
    processEventSoon(eventId);
  }

  return { expired: eventIds.length };
}

export async function grantSignupPremiumIfEnabled(userId: string) {
  if (process.env.SIGNUP_PREMIUM_ENABLED !== 'true') {
    return { skipped: true as const, reason: 'disabled' };
  }

  const rawDays = Number.parseInt(process.env.SIGNUP_PREMIUM_DURATION_DAYS || '7', 10);
  const days = Number.isFinite(rawDays) ? rawDays : 7;
  if (days <= 0 || days > 3660) {
    throw new Error('SIGNUP_PREMIUM_DURATION_DAYS must be between 1 and 3660');
  }

  const startsAt = new Date();
  const expiresAt = new Date(startsAt.getTime() + days * 24 * 60 * 60 * 1000);
  const result = await grantEntitlement({
    userId,
    type: 'premium',
    startsAt,
    expiresAt,
    grantedBy: null,
    reason: 'New user Premium trial',
    source: 'signup_promotion',
    metadata: {
      promotion: 'signup_premium',
      durationDays: days,
    },
    idempotencyKey: `signup_premium:${userId}:v1`,
    stackWithActive: false,
  });

  return { skipped: false as const, ...result };
}
