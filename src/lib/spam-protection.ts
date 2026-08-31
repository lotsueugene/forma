/**
 * Spam protection for form submissions.
 * Layers: honeypot, origin allowlist, challenge token, rate limit,
 * duplicate payload, content (link density), reCAPTCHA v3.
 */

import { createHash } from 'node:crypto';
import { checkRateLimit } from './rate-limiter';
import { verifyFormChallenge } from './form-challenge';
import {
  type SpamSettings,
  honeypotTriggered,
  countLinks,
  isOriginAllowed,
  cleanSpamFields,
} from './spam-settings';

export type {
  SpamSettings,
} from './spam-settings';

export {
  parseSpamSettings,
  getDefaultSpamSettings,
  cleanSpamFields,
  honeypotHtml,
  buildHtmlEmbed,
  HONEYPOT_FIELD,
  CHALLENGE_FIELD,
} from './spam-settings';

export type SpamCheckCode =
  | 'honeypot'
  | 'rate_limit'
  | 'recaptcha'
  | 'recaptcha_error'
  | 'content_filter'
  | 'origin'
  | 'challenge'
  | 'too_fast'
  | 'duplicate';

export interface SpamCheckResult {
  allowed: boolean;
  reason?: string;
  code?: SpamCheckCode;
  retryAfter?: number;
}

interface SpamCheckParams {
  formId: string;
  ip: string | null;
  data: Record<string, unknown>;
  settings: SpamSettings;
  recaptchaToken?: string;
  challengeToken?: string;
  origin?: string | null;
  referer?: string | null;
}

const duplicateStore = new Map<string, number>();
const DUPLICATE_WINDOW_MS = 15_000;

setInterval(() => {
  const cutoff = Date.now() - DUPLICATE_WINDOW_MS;
  for (const [key, ts] of duplicateStore.entries()) {
    if (ts < cutoff) duplicateStore.delete(key);
  }
}, 60_000).unref?.();

function payloadFingerprint(formId: string, ip: string, data: Record<string, unknown>): string {
  const cleaned = cleanSpamFields(data);
  const canonical = JSON.stringify(cleaned, Object.keys(cleaned).sort());
  const hash = createHash('sha256').update(canonical).digest('hex').slice(0, 16);
  return `${formId}:${ip}:${hash}`;
}

function isDuplicate(formId: string, ip: string, data: Record<string, unknown>): boolean {
  const key = payloadFingerprint(formId, ip, data);
  const now = Date.now();
  const previous = duplicateStore.get(key);
  if (previous && now - previous < DUPLICATE_WINDOW_MS) {
    return true;
  }
  duplicateStore.set(key, now);
  return false;
}

/**
 * Check submission for spam. Returns on first failure.
 */
export async function checkSpam(params: SpamCheckParams): Promise<SpamCheckResult> {
  const { formId, ip, data, settings, recaptchaToken, challengeToken, origin, referer } = params;

  // 1. Honeypot — bots that autofill every input
  if (settings.honeypot?.enabled !== false) {
    const fieldName = settings.honeypot?.fieldName || '_gotcha';
    if (honeypotTriggered(data, fieldName)) {
      return {
        allowed: false,
        reason: 'spam_detected',
        code: 'honeypot',
      };
    }
  }

  // 2. Origin / Referer allowlist (opt-in)
  const allowedDomains = settings.allowedDomains || [];
  if (allowedDomains.length > 0 && !isOriginAllowed(origin, referer, allowedDomains)) {
    return {
      allowed: false,
      reason: 'This form does not accept submissions from this website',
      code: 'origin',
    };
  }

  // 3. Browser challenge token
  // Always validate a token if one is present (hosted forms send it).
  // Only require it when the form owner turned on "browser verification".
  if (challengeToken) {
    const result = verifyFormChallenge(challengeToken, formId);
    if (!result.ok) {
      if (result.code === 'too_fast') {
        return { allowed: false, reason: 'spam_detected', code: 'too_fast' };
      }
      if (settings.requireChallenge) {
        return {
          allowed: false,
          reason: 'Verification expired. Refresh the page and try again.',
          code: 'challenge',
        };
      }
    }
  } else if (settings.requireChallenge) {
    return {
      allowed: false,
      reason: 'This form requires browser verification',
      code: 'challenge',
    };
  }

  // 4. Rate limiting
  if (settings.rateLimit?.enabled !== false && ip) {
    const config = {
      maxPerMinute: settings.rateLimit?.maxPerMinute || 5,
      maxPerHour: settings.rateLimit?.maxPerHour || 30,
    };
    const result = checkRateLimit(`${ip}:${formId}`, config);
    if (!result.allowed) {
      return {
        allowed: false,
        reason: result.reason,
        code: 'rate_limit',
        retryAfter: result.retryAfter,
      };
    }
  }

  // 5. Duplicate identical payload from the same IP (double-submit / retry bots)
  if (ip && isDuplicate(formId, ip, data)) {
    return {
      allowed: false,
      reason: 'Duplicate submission. Please wait a moment before sending again.',
      code: 'duplicate',
    };
  }

  // 6. Link-density content filter
  if (settings.contentFilter?.enabled !== false) {
    const maxLinks = settings.contentFilter?.maxLinks ?? 10;
    const links = countLinks(cleanSpamFields(data));
    if (links > maxLinks) {
      return {
        allowed: false,
        reason: 'Submission blocked',
        code: 'content_filter',
      };
    }
  }

  // 7. reCAPTCHA v3 — verify when a token is sent; require it when enabled
  if (settings.recaptcha?.enabled && !recaptchaToken) {
    return {
      allowed: false,
      reason: 'reCAPTCHA verification required',
      code: 'recaptcha',
    };
  }

  if (recaptchaToken) {
    const secretKey = settings.recaptcha?.secretKey || process.env.RECAPTCHA_SECRET_KEY;
    if (secretKey) {
      const recaptchaResult = await verifyRecaptcha(
        secretKey,
        recaptchaToken,
        ip,
        settings.recaptcha?.minScore || 0.5
      );
      if (!recaptchaResult.allowed) {
        return recaptchaResult;
      }
    }
  }

  return { allowed: true };
}

async function verifyRecaptcha(
  secretKey: string,
  token: string,
  ip: string | null,
  minScore: number
): Promise<SpamCheckResult> {
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        ...(ip && { remoteip: ip }),
      }),
    });

    const data = await response.json() as {
      success: boolean;
      score?: number;
      'error-codes'?: string[];
    };

    if (!data.success) {
      console.error('reCAPTCHA verification failed:', data['error-codes']);
      return {
        allowed: false,
        reason: 'reCAPTCHA verification failed',
        code: 'recaptcha_error',
      };
    }

    if (typeof data.score === 'number' && data.score < minScore) {
      return {
        allowed: false,
        reason: `reCAPTCHA score too low (${data.score.toFixed(2)})`,
        code: 'recaptcha',
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    // Don't block humans because Google was unreachable
    return { allowed: true };
  }
}
