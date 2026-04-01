/**
 * Spam protection for form submissions
 * Supports: honeypot fields, rate limiting, reCAPTCHA v3
 */

import { checkRateLimit } from './rate-limiter';

export interface SpamSettings {
  honeypot?: {
    enabled: boolean;
    fieldName: string; // Custom honeypot field name (default: _honeypot)
  };
  rateLimit?: {
    enabled: boolean;
    maxPerMinute: number; // Default: 5
    maxPerHour: number; // Default: 30
  };
  recaptcha?: {
    enabled: boolean;
    secretKey: string;
    minScore: number; // 0.0 - 1.0, default: 0.5
  };
}

export interface SpamCheckResult {
  allowed: boolean;
  reason?: string;
  code?: 'honeypot' | 'rate_limit' | 'recaptcha' | 'recaptcha_error';
  retryAfter?: number;
}

interface SpamCheckParams {
  formId: string;
  ip: string | null;
  data: Record<string, unknown>;
  settings: SpamSettings;
  recaptchaToken?: string;
}

/**
 * Check submission for spam
 * Returns immediately on first failure
 */
export async function checkSpam(params: SpamCheckParams): Promise<SpamCheckResult> {
  const { formId, ip, data, settings, recaptchaToken } = params;

  // 1. Honeypot check
  if (settings.honeypot?.enabled) {
    const fieldName = settings.honeypot.fieldName || '_honeypot';
    const honeypotValue = data[fieldName];

    // Also check common honeypot field names
    const commonHoneypots = ['_honeypot', '_gotcha', 'honeypot', 'website', 'url_field'];
    for (const field of commonHoneypots) {
      if (data[field] && typeof data[field] === 'string' && data[field] !== '') {
        // Don't reveal to bots that we caught them - return success-like response
        return {
          allowed: false,
          reason: 'spam_detected',
          code: 'honeypot',
        };
      }
    }

    if (honeypotValue && typeof honeypotValue === 'string' && honeypotValue !== '') {
      return {
        allowed: false,
        reason: 'spam_detected',
        code: 'honeypot',
      };
    }
  }

  // 2. Rate limiting
  if (settings.rateLimit?.enabled && ip) {
    const config = {
      maxPerMinute: settings.rateLimit.maxPerMinute || 5,
      maxPerHour: settings.rateLimit.maxPerHour || 30,
    };

    // Rate limit by IP + formId combination
    const rateLimitKey = `${ip}:${formId}`;
    const result = checkRateLimit(rateLimitKey, config);

    if (!result.allowed) {
      return {
        allowed: false,
        reason: result.reason,
        code: 'rate_limit',
        retryAfter: result.retryAfter,
      };
    }
  }

  // 3. reCAPTCHA v3 verification (only if token provided)
  // Hosted form page sends token automatically, API calls don't need it
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

/**
 * Verify reCAPTCHA v3 token with Google
 */
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
      action?: string;
      challenge_ts?: string;
      hostname?: string;
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

    // Check score (v3 only)
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
    // On error, allow submission but log the issue
    // This prevents legitimate users from being blocked due to network issues
    return { allowed: true };
  }
}

/**
 * Parse spam settings from form settings JSON
 * If reCAPTCHA is enabled but no secretKey provided, uses env var
 */
export function parseSpamSettings(formSettings: string | null): SpamSettings {
  if (!formSettings) {
    return getDefaultSpamSettings();
  }

  try {
    const settings = JSON.parse(formSettings) as { spam?: SpamSettings };
    const spamSettings = settings.spam || getDefaultSpamSettings();

    // If reCAPTCHA enabled but no key, use env var
    if (spamSettings.recaptcha?.enabled && !spamSettings.recaptcha.secretKey) {
      spamSettings.recaptcha.secretKey = process.env.RECAPTCHA_SECRET_KEY || '';
    }

    return spamSettings;
  } catch {
    return getDefaultSpamSettings();
  }
}

/**
 * Get default spam settings for new forms
 * reCAPTCHA is disabled by default - must be explicitly enabled per form
 */
export function getDefaultSpamSettings(): SpamSettings {
  return {
    honeypot: {
      enabled: true,
      fieldName: '_honeypot',
    },
    rateLimit: {
      enabled: true,
      maxPerMinute: 5,
      maxPerHour: 30,
    },
    recaptcha: {
      enabled: false,
      secretKey: '',
      minScore: 0.5,
    },
  };
}

/**
 * Clean spam-related fields from submission data
 */
export function cleanSpamFields(data: Record<string, unknown>): Record<string, unknown> {
  const cleaned = { ...data };
  const spamFields = [
    '_honeypot', '_gotcha', 'honeypot', 'g-recaptcha-response',
    'recaptchaToken', '_recaptcha', '_redirect', '_subject'
  ];

  for (const field of spamFields) {
    delete cleaned[field];
  }

  return cleaned;
}
