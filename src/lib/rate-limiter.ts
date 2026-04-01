/**
 * In-memory rate limiter for form submissions
 * Uses sliding window algorithm
 */

interface RateLimitEntry {
  timestamps: number[];
}

// Global store for rate limit data
// In production, consider using Redis for multi-instance support
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    for (const [key, entry] of rateLimitStore.entries()) {
      // Remove timestamps older than 1 hour
      entry.timestamps = entry.timestamps.filter(ts => ts > oneHourAgo);
      // Remove entry if no timestamps left
      if (entry.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

// Start cleanup on module load
startCleanup();

interface RateLimitConfig {
  maxPerMinute: number;
  maxPerHour: number;
}

interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfter?: number; // seconds until next allowed request
}

/**
 * Check if a request should be rate limited
 * @param key - Unique identifier (e.g., "ip:formId" or just "ip")
 * @param config - Rate limit configuration
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneHourAgo = now - 60 * 60 * 1000;

  let entry = rateLimitStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitStore.set(key, entry);
  }

  // Clean old timestamps
  entry.timestamps = entry.timestamps.filter(ts => ts > oneHourAgo);

  // Count requests in last minute and hour
  const requestsLastMinute = entry.timestamps.filter(ts => ts > oneMinuteAgo).length;
  const requestsLastHour = entry.timestamps.length;

  // Check minute limit
  if (requestsLastMinute >= config.maxPerMinute) {
    const oldestInMinute = entry.timestamps.find(ts => ts > oneMinuteAgo) || now;
    const retryAfter = Math.ceil((oldestInMinute + 60 * 1000 - now) / 1000);
    return {
      allowed: false,
      reason: `Rate limit exceeded. Maximum ${config.maxPerMinute} submissions per minute.`,
      retryAfter,
    };
  }

  // Check hour limit
  if (requestsLastHour >= config.maxPerHour) {
    const oldestInHour = entry.timestamps[0] || now;
    const retryAfter = Math.ceil((oldestInHour + 60 * 60 * 1000 - now) / 1000);
    return {
      allowed: false,
      reason: `Rate limit exceeded. Maximum ${config.maxPerHour} submissions per hour.`,
      retryAfter,
    };
  }

  // Record this request
  entry.timestamps.push(now);

  return { allowed: true };
}

/**
 * Reset rate limit for a key (useful for testing or admin override)
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Get current rate limit status without incrementing
 */
export function getRateLimitStatus(key: string, config: RateLimitConfig): {
  requestsLastMinute: number;
  requestsLastHour: number;
  remainingMinute: number;
  remainingHour: number;
} {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneHourAgo = now - 60 * 60 * 1000;

  const entry = rateLimitStore.get(key);
  if (!entry) {
    return {
      requestsLastMinute: 0,
      requestsLastHour: 0,
      remainingMinute: config.maxPerMinute,
      remainingHour: config.maxPerHour,
    };
  }

  const timestamps = entry.timestamps.filter(ts => ts > oneHourAgo);
  const requestsLastMinute = timestamps.filter(ts => ts > oneMinuteAgo).length;
  const requestsLastHour = timestamps.length;

  return {
    requestsLastMinute,
    requestsLastHour,
    remainingMinute: Math.max(0, config.maxPerMinute - requestsLastMinute),
    remainingHour: Math.max(0, config.maxPerHour - requestsLastHour),
  };
}
