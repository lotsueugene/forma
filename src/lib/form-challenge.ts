import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const CHALLENGE_MIN_AGE_MS = 1_000;
export const CHALLENGE_MAX_AGE_MS = 30 * 60 * 1000;

export type ChallengeFailure = 'invalid' | 'mismatch' | 'too_fast' | 'expired';

export interface ChallengeVerifyResult {
  ok: boolean;
  code?: ChallengeFailure;
}

function getSecret(override?: string): string | null {
  const secret = override ?? process.env.NEXTAUTH_SECRET;
  return secret && secret.length > 0 ? secret : null;
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function signaturesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Issue a one-time-ish submission token bound to a form.
 * Format: formId.issuedAtMs.nonce.hmac
 */
export function createFormChallenge(
  formId: string,
  options: { now?: number; secret?: string } = {}
): string {
  const secret = getSecret(options.secret);
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is required to issue form challenges');
  }

  const issuedAt = options.now ?? Date.now();
  const nonce = randomBytes(8).toString('hex');
  const payload = `${formId}.${issuedAt}.${nonce}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyFormChallenge(
  token: string | undefined,
  formId: string,
  options: {
    now?: number;
    secret?: string;
    minAgeMs?: number;
    maxAgeMs?: number;
  } = {}
): ChallengeVerifyResult {
  if (!token || typeof token !== 'string') {
    return { ok: false, code: 'invalid' };
  }

  const secret = getSecret(options.secret);
  if (!secret) {
    return { ok: false, code: 'invalid' };
  }

  const lastDot = token.lastIndexOf('.');
  if (lastDot <= 0) return { ok: false, code: 'invalid' };

  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const parts = payload.split('.');
  if (parts.length !== 3) return { ok: false, code: 'invalid' };

  const [tokenFormId, issuedRaw, nonce] = parts;
  if (!tokenFormId || !issuedRaw || !nonce) return { ok: false, code: 'invalid' };
  if (tokenFormId !== formId) return { ok: false, code: 'mismatch' };

  const expected = sign(payload, secret);
  if (!signaturesMatch(sig, expected)) return { ok: false, code: 'invalid' };

  const issuedAt = Number(issuedRaw);
  if (!Number.isFinite(issuedAt)) return { ok: false, code: 'invalid' };

  const now = options.now ?? Date.now();
  const age = now - issuedAt;
  const minAge = options.minAgeMs ?? CHALLENGE_MIN_AGE_MS;
  const maxAge = options.maxAgeMs ?? CHALLENGE_MAX_AGE_MS;

  if (age < minAge) return { ok: false, code: 'too_fast' };
  if (age > maxAge) return { ok: false, code: 'expired' };

  return { ok: true };
}
