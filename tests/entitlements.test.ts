import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateStackedGrantWindow,
  deriveEntitlementStatus,
  isEntitlementValidAt,
} from '../src/lib/entitlements';

const now = new Date('2026-08-27T15:00:00.000Z');

test('valid active entitlement requires current window and no revocation', () => {
  const entitlement = {
    startsAt: new Date('2026-08-27T14:00:00.000Z'),
    expiresAt: new Date('2026-08-28T15:00:00.000Z'),
    revokedAt: null,
  };

  assert.equal(isEntitlementValidAt(entitlement, now), true);
  assert.equal(deriveEntitlementStatus(entitlement, now), 'active');
});

test('future entitlement is scheduled and does not authorize access yet', () => {
  const entitlement = {
    startsAt: new Date('2026-08-28T15:00:00.000Z'),
    expiresAt: new Date('2026-08-29T15:00:00.000Z'),
    revokedAt: null,
  };

  assert.equal(isEntitlementValidAt(entitlement, now), false);
  assert.equal(deriveEntitlementStatus(entitlement, now), 'scheduled');
});

test('expired entitlement denies access even if stored status is stale', () => {
  const entitlement = {
    startsAt: new Date('2026-08-01T15:00:00.000Z'),
    expiresAt: new Date('2026-08-27T15:00:00.000Z'),
    revokedAt: null,
  };

  assert.equal(isEntitlementValidAt(entitlement, now), false);
  assert.equal(deriveEntitlementStatus(entitlement, now), 'expired');
});

test('permanent entitlement authorizes access with a null expiration', () => {
  const entitlement = {
    startsAt: new Date('2026-08-01T15:00:00.000Z'),
    expiresAt: null,
    revokedAt: null,
  };

  assert.equal(isEntitlementValidAt(entitlement, now), true);
  assert.equal(deriveEntitlementStatus(entitlement, now), 'active');
});

test('revoked entitlement denies access regardless of dates', () => {
  const entitlement = {
    startsAt: new Date('2026-08-01T15:00:00.000Z'),
    expiresAt: new Date('2026-09-01T15:00:00.000Z'),
    revokedAt: new Date('2026-08-20T15:00:00.000Z'),
  };

  assert.equal(isEntitlementValidAt(entitlement, now), false);
  assert.equal(deriveEntitlementStatus(entitlement, now), 'revoked');
});

test('duration grants stack onto the latest finite active access end', () => {
  const requestedStartsAt = new Date('2026-08-27T15:00:00.000Z');
  const requestedExpiresAt = new Date('2026-09-26T15:00:00.000Z');
  const latestFiniteAccessEnd = new Date('2026-10-10T15:00:00.000Z');

  const result = calculateStackedGrantWindow({
    requestedStartsAt,
    requestedExpiresAt,
    latestFiniteAccessEnd,
    stackWithActive: true,
  });

  assert.equal(result.stacked, true);
  assert.equal(result.startsAt.toISOString(), '2026-10-10T15:00:00.000Z');
  assert.equal(result.expiresAt?.toISOString(), '2026-11-09T15:00:00.000Z');
});

test('custom date grants do not stack by default', () => {
  const requestedStartsAt = new Date('2026-08-27T15:00:00.000Z');
  const requestedExpiresAt = new Date('2026-09-26T15:00:00.000Z');
  const latestFiniteAccessEnd = new Date('2026-10-10T15:00:00.000Z');

  const result = calculateStackedGrantWindow({
    requestedStartsAt,
    requestedExpiresAt,
    latestFiniteAccessEnd,
    stackWithActive: false,
  });

  assert.equal(result.stacked, false);
  assert.equal(result.startsAt.toISOString(), requestedStartsAt.toISOString());
  assert.equal(result.expiresAt?.toISOString(), requestedExpiresAt.toISOString());
});
