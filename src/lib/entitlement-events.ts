import { prisma } from './prisma';
import { publishToUser } from './notifications/pubsub';
import { sendPremiumGrantedEmail } from './email';

export const ENTITLEMENT_EVENT_TYPES = [
  'entitlement.granted',
  'entitlement.extended',
  'entitlement.revoked',
  'entitlement.expired',
] as const;

export type EntitlementEventType = typeof ENTITLEMENT_EVENT_TYPES[number];

export interface EntitlementEventPayload {
  entitlementId: string;
  userId: string;
  type: string;
  startsAt: string;
  expiresAt: string | null;
  source: string;
  reason?: string | null;
  actorId?: string | null;
}

function parsePayload(payload: string): EntitlementEventPayload {
  const parsed = JSON.parse(payload) as Partial<EntitlementEventPayload>;
  if (!parsed.entitlementId || !parsed.userId || !parsed.type || !parsed.startsAt) {
    throw new Error('Malformed entitlement event payload');
  }
  return {
    entitlementId: parsed.entitlementId,
    userId: parsed.userId,
    type: parsed.type,
    startsAt: parsed.startsAt,
    expiresAt: parsed.expiresAt ?? null,
    source: parsed.source || 'system',
    reason: parsed.reason ?? null,
    actorId: parsed.actorId ?? null,
  };
}

function formatLongDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

async function createPremiumGrantNotification(payload: EntitlementEventPayload) {
  const expiresText = formatLongDate(payload.expiresAt);
  const body = expiresText
    ? `Premium is active until ${expiresText}.`
    : 'Premium access has no expiration date.';

  const notification = await prisma.notification.upsert({
    where: { dedupeKey: `entitlement:premium-granted:${payload.entitlementId}` },
    update: {},
    create: {
      userId: payload.userId,
      type: 'premium_granted',
      title: "You've received Premium",
      body,
      href: '/dashboard',
      entitlementId: payload.entitlementId,
      dedupeKey: `entitlement:premium-granted:${payload.entitlementId}`,
    },
  });

  publishToUser(payload.userId, {
    id: notification.id,
    type: notification.type,
    title: notification.title,
  });
}

async function sendPremiumGrantEmail(payload: EntitlementEventPayload) {
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { email: true, name: true },
  });

  if (!user?.email) {
    throw new Error('User has no email address for premium notification');
  }

  const result = await sendPremiumGrantedEmail({
    to: user.email,
    name: user.name,
    startsAt: new Date(payload.startsAt),
    expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
  });

  if (!result.success) {
    throw new Error(result.error || 'Premium email failed');
  }
}

export async function processEntitlementEvent(eventId: string) {
  const event = await prisma.entitlementEvent.findUnique({
    where: { id: eventId },
  });

  if (!event || event.status === 'processed') return;

  const errors: string[] = [];
  let payload: EntitlementEventPayload;

  try {
    payload = parsePayload(event.payload);
  } catch (error) {
    await prisma.entitlementEvent.update({
      where: { id: event.id },
      data: {
        attempts: { increment: 1 },
        status: 'failed',
        lastError: error instanceof Error ? error.message : String(error),
      },
    });
    return;
  }

  if (event.type === 'entitlement.granted' && payload.type === 'premium') {
    try {
      await createPremiumGrantNotification(payload);
    } catch (error) {
      errors.push(`notification: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      await sendPremiumGrantEmail(payload);
    } catch (error) {
      errors.push(`email: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  await prisma.entitlementEvent.update({
    where: { id: event.id },
    data: {
      attempts: { increment: 1 },
      status: errors.length > 0 ? 'failed' : 'processed',
      processedAt: errors.length > 0 ? null : new Date(),
      lastError: errors.length > 0 ? errors.join('\n') : null,
    },
  });
}

export async function processPendingEntitlementEvents(limit = 25) {
  const events = await prisma.entitlementEvent.findMany({
    where: {
      status: { in: ['pending', 'failed'] },
      attempts: { lt: 5 },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { id: true },
  });

  for (const event of events) {
    await processEntitlementEvent(event.id);
  }

  return { processed: events.length };
}
