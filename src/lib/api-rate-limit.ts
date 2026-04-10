/**
 * Global API rate limiter
 * Applies to all API routes to prevent abuse
 */

const store = new Map<string, { count: number; resetAt: number }>();

// Clean up every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

interface RateLimitOptions {
  limit: number;       // max requests
  windowMs: number;    // time window in ms
}

const DEFAULTS: Record<string, RateLimitOptions> = {
  auth:       { limit: 10,  windowMs: 60 * 1000 },      // 10/min for login/register
  submission: { limit: 30,  windowMs: 60 * 1000 },      // 30/min for form submissions
  api:        { limit: 100, windowMs: 60 * 1000 },      // 100/min for general API
  upload:     { limit: 10,  windowMs: 60 * 1000 },      // 10/min for file uploads
};

export function apiRateLimit(
  ip: string,
  category: keyof typeof DEFAULTS = 'api'
): { allowed: boolean; remaining: number; retryAfter?: number } {
  const config = DEFAULTS[category];
  const key = `${category}:${ip}`;
  const now = Date.now();

  let entry = store.get(key);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + config.windowMs };
    store.set(key, entry);
  }

  entry.count++;

  if (entry.count > config.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  return { allowed: true, remaining: config.limit - entry.count };
}

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real;
  return '127.0.0.1';
}
