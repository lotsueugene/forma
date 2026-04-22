/**
 * Account lockout system.
 * Locks accounts after repeated failed auth attempts.
 * Notifies account owner via email on lockout.
 */

import { sendEmail, isEmailConfigured } from './email';
import { auditLog, securityLog } from './audit';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minute window for counting failures

interface LockoutEntry {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
  notified: boolean;
}

const lockoutStore = new Map<string, LockoutEntry>();

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of lockoutStore) {
    if (entry.lockedUntil && now > entry.lockedUntil) {
      lockoutStore.delete(key);
    } else if (!entry.lockedUntil && now > entry.firstAttemptAt + ATTEMPT_WINDOW_MS) {
      lockoutStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Check if an account is locked.
 * @returns { locked: boolean, remainingMs: number }
 */
export function isAccountLocked(key: string): { locked: boolean; remainingMs: number } {
  const entry = lockoutStore.get(key);
  if (!entry || !entry.lockedUntil) return { locked: false, remainingMs: 0 };

  const now = Date.now();
  if (now >= entry.lockedUntil) {
    lockoutStore.delete(key);
    return { locked: false, remainingMs: 0 };
  }

  return { locked: true, remainingMs: entry.lockedUntil - now };
}

/**
 * Record a failed auth attempt. Returns true if account is now locked.
 */
export async function recordFailedAttempt(
  key: string,
  details?: { email?: string; ip?: string; userId?: string }
): Promise<boolean> {
  const now = Date.now();
  let entry = lockoutStore.get(key);

  if (!entry || (now > entry.firstAttemptAt + ATTEMPT_WINDOW_MS && !entry.lockedUntil)) {
    // Reset — window expired
    entry = { attempts: 1, firstAttemptAt: now, lockedUntil: null, notified: false };
    lockoutStore.set(key, entry);
    return false;
  }

  entry.attempts++;

  if (entry.attempts >= MAX_FAILED_ATTEMPTS && !entry.lockedUntil) {
    // Lock the account
    entry.lockedUntil = now + LOCKOUT_DURATION_MS;
    lockoutStore.set(key, entry);

    securityLog({
      action: 'security.account_locked',
      userId: details?.userId,
      ip: details?.ip,
      details: {
        email: details?.email,
        attempts: entry.attempts,
        lockedUntilIso: new Date(entry.lockedUntil).toISOString(),
      },
    });

    // Send notification email
    if (details?.email && !entry.notified && isEmailConfigured()) {
      entry.notified = true;
      try {
        const lockoutMinutes = Math.round(LOCKOUT_DURATION_MS / 60000);
        await sendEmail({
          to: details.email,
          subject: 'Security Alert: Account Locked',
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
              <h2 style="font-size: 20px; font-weight: 600; color: #dc2626; margin-bottom: 16px;">Account Locked</h2>
              <p style="color: #4b5563; margin-bottom: 16px;">
                Your account has been temporarily locked after ${MAX_FAILED_ATTEMPTS} failed login attempts.
              </p>
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <p style="margin: 0; color: #991b1b; font-size: 14px;">
                  <strong>Locked for:</strong> ${lockoutMinutes} minutes<br>
                  <strong>Time:</strong> ${new Date().toLocaleString('en-US')}<br>
                  ${details.ip ? `<strong>IP Address:</strong> ${details.ip}` : ''}
                </p>
              </div>
              <p style="color: #4b5563; margin-bottom: 16px;">
                If this was you, wait ${lockoutMinutes} minutes and try again. If this wasn't you, someone may be trying to access your account. Consider changing your password.
              </p>
              <a href="${process.env.NEXTAUTH_URL || 'https://withforma.io'}/forgot-password"
                 style="display: inline-block; padding: 12px 24px; background: #ef6f2e; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
                Reset Password
              </a>
              <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">
                This is an automated security alert from Forma.
              </p>
            </div>
          `,
        });
      } catch (err) {
        console.error('Failed to send lockout notification:', err);
      }
    }

    return true;
  }

  lockoutStore.set(key, entry);
  return false;
}

/**
 * Clear failed attempts on successful login.
 */
export function clearFailedAttempts(key: string): void {
  lockoutStore.delete(key);
}
