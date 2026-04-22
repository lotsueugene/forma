/**
 * AES-256-GCM encryption for integration configs at rest.
 *
 * Integration configs hold third-party credentials: Slack webhook URLs,
 * Notion/Airtable/HubSpot API keys, Google OAuth refresh tokens, etc. A
 * database dump or replica leak must not expose those.
 *
 * Storage format is a single string:
 *     "enc:v1:<iv-b64>:<tag-b64>:<ciphertext-b64>"
 *
 * Unencrypted legacy rows (raw JSON) are still readable via `decryptConfig`
 * so the system keeps working across the rollout. Writers always go
 * through `encryptConfig`, so rows lazily upgrade on first save after
 * deploy. A one-shot migration script can sweep the rest if desired.
 *
 * Key material comes from INTEGRATION_SECRET_KEY (32-byte hex or base64).
 * For convenience, falls back to NEXTAUTH_SECRET in dev so local stacks
 * keep working without extra env wiring. In production the app will
 * refuse to boot without a dedicated key — rotating NEXTAUTH_SECRET
 * should NOT invalidate every integration config.
 */

import crypto from 'crypto';

const PREFIX = 'enc:v1:';

function loadKey(): Buffer {
  const raw = process.env.INTEGRATION_SECRET_KEY || '';
  if (raw) {
    // Accept either 64-char hex or base64-encoded 32 bytes.
    if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
    const b = Buffer.from(raw, 'base64');
    if (b.length === 32) return b;
    throw new Error(
      'INTEGRATION_SECRET_KEY must be 32 bytes (64 hex chars or base64 of 32 bytes)'
    );
  }

  // Dev fallback: derive a stable 32-byte key from NEXTAUTH_SECRET so
  // local development works without extra setup. In production we require
  // a dedicated key so rotating NextAuth's secret doesn't wipe configs.
  const fallback = process.env.NEXTAUTH_SECRET || '';
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'INTEGRATION_SECRET_KEY is required in production. Generate one with: openssl rand -hex 32'
    );
  }
  if (!fallback) {
    throw new Error(
      'Neither INTEGRATION_SECRET_KEY nor NEXTAUTH_SECRET is set. Cannot encrypt integration configs.'
    );
  }
  return crypto.createHash('sha256').update(`integration:${fallback}`).digest();
}

let cachedKey: Buffer | null = null;
function getKey(): Buffer {
  if (!cachedKey) cachedKey = loadKey();
  return cachedKey;
}

/** Encrypt a config object for storage. */
export function encryptConfig(config: Record<string, unknown>): string {
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit nonce for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(config), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return (
    PREFIX +
    iv.toString('base64') +
    ':' +
    tag.toString('base64') +
    ':' +
    ciphertext.toString('base64')
  );
}

/**
 * Decrypt a config string. Transparently handles legacy plaintext rows
 * so the app keeps working while old rows are still in the DB.
 */
export function decryptConfig<T = Record<string, unknown>>(stored: string): T {
  if (!stored) return {} as T;

  // Legacy plaintext JSON (pre-encryption rows).
  if (!stored.startsWith(PREFIX)) {
    try {
      return JSON.parse(stored) as T;
    } catch {
      return {} as T;
    }
  }

  const rest = stored.slice(PREFIX.length);
  const parts = rest.split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted config');
  }
  const [ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ciphertext = Buffer.from(ctB64, 'base64');

  const key = getKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8')) as T;
}

/** `true` if the given stored string is already in the encrypted format. */
export function isEncryptedConfig(stored: string): boolean {
  return typeof stored === 'string' && stored.startsWith(PREFIX);
}

/**
 * Safely redact a secret string for display. Returns the first 4 chars
 * (usually a non-sensitive prefix like `patA` / `secr` / `xoxb`) followed
 * by a fixed-length mask. Never leaks tail bytes.
 */
export function redactSecret(value: string | undefined | null): string {
  if (!value) return '';
  if (value.length <= 4) return '••••';
  return value.slice(0, 4) + '••••••••';
}
