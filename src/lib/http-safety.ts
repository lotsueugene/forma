/**
 * Shared HTTP-safety helpers used anywhere the server is about to `fetch()`
 * a user-supplied URL (custom webhooks, 3rd-party integration webhooks, etc).
 *
 * Blocks loopback, link-local, RFC1918 private ranges, cloud metadata
 * endpoints, and non-HTTPS in production to prevent SSRF and exfiltration
 * of internal service tokens.
 */

const DENY_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',        // GCP IMDS
  'metadata',                        // GCP IMDS short name
  'instance-data',                   // Azure IMDS short name
]);

export interface UrlSafetyResult {
  safe: boolean;
  reason?: string;
}

/**
 * Returns whether `url` is safe to `fetch()` from the server. Does NOT
 * attempt DNS resolution — callers should additionally use a fetch that
 * rejects on redirect to a private IP if they need belt-and-suspenders
 * coverage for DNS-rebinding. For our purposes (webhook URLs that users
 * typed in), hostname inspection is the high-signal check.
 */
export function checkUrlSafety(url: string): UrlSafetyResult {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { safe: false, reason: 'Not a valid URL' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { safe: false, reason: `Protocol "${parsed.protocol}" is not allowed` };
  }

  // Require HTTPS in production. Local dev can use http for e.g. ngrok.
  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
    return { safe: false, reason: 'Only HTTPS URLs are allowed' };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (DENY_HOSTNAMES.has(hostname)) {
    return { safe: false, reason: 'Internal or cloud metadata endpoints are not allowed' };
  }

  if (hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return { safe: false, reason: 'Internal hostnames are not allowed' };
  }

  // IPv4 literal — block private/link-local/loopback/etc.
  const v4 = hostname.split('.');
  if (v4.length === 4 && v4.every((p) => /^\d+$/.test(p))) {
    const [a, b] = v4.map((p) => parseInt(p, 10));
    if (a === 10) return { safe: false, reason: 'Private address range (10/8) is not allowed' };
    if (a === 127) return { safe: false, reason: 'Loopback addresses are not allowed' };
    if (a === 169 && b === 254) return { safe: false, reason: 'Link-local / cloud metadata addresses are not allowed' };
    if (a === 172 && b >= 16 && b <= 31) return { safe: false, reason: 'Private address range (172.16/12) is not allowed' };
    if (a === 192 && b === 168) return { safe: false, reason: 'Private address range (192.168/16) is not allowed' };
    if (a === 0) return { safe: false, reason: 'Reserved address range (0/8) is not allowed' };
    if (a >= 224) return { safe: false, reason: 'Multicast / reserved address range is not allowed' };
  }

  // Crude IPv6 literal check — block loopback/link-local/unique-local.
  if (hostname.includes(':')) {
    if (hostname === '::1' || hostname.startsWith('::1')) {
      return { safe: false, reason: 'IPv6 loopback is not allowed' };
    }
    if (hostname.startsWith('fe80') || hostname.startsWith('fc') || hostname.startsWith('fd')) {
      return { safe: false, reason: 'IPv6 link-local / unique-local address is not allowed' };
    }
  }

  return { safe: true };
}

/** Convenience wrapper that throws with a descriptive message. */
export function assertUrlSafe(url: string, label = 'URL'): void {
  const check = checkUrlSafety(url);
  if (!check.safe) {
    throw new Error(`${label} blocked: ${check.reason}`);
  }
}
