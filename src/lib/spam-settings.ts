/**
 * Spam protection settings, parsing, and pure checks.
 * Safe to import from client components (no timers / Node-only deps).
 */

export const HONEYPOT_FIELD = '_gotcha';
export const CHALLENGE_FIELD = '_forma_token';

export interface SpamSettings {
  honeypot?: {
    enabled: boolean;
    fieldName: string;
  };
  rateLimit?: {
    enabled: boolean;
    maxPerMinute: number;
    maxPerHour: number;
  };
  recaptcha?: {
    enabled: boolean;
    secretKey: string;
    minScore: number;
  };
  contentFilter?: {
    enabled: boolean;
    maxLinks: number;
  };
  /** When true, submissions must include a valid one-time challenge token. */
  requireChallenge?: boolean;
  /** Hostnames allowed to submit (empty = any origin). www. is treated as equivalent. */
  allowedDomains?: string[];
}

export function getDefaultSpamSettings(): Required<Pick<
  SpamSettings,
  'honeypot' | 'rateLimit' | 'recaptcha' | 'contentFilter' | 'requireChallenge' | 'allowedDomains'
>> {
  return {
    honeypot: {
      enabled: true,
      fieldName: HONEYPOT_FIELD,
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
    contentFilter: {
      enabled: true,
      maxLinks: 10,
    },
    requireChallenge: false,
    allowedDomains: [],
  };
}

/**
 * Parse spam settings from form settings JSON, filling in defaults
 * so partial objects still get honeypot / rate limit / content filter.
 */
export function parseSpamSettings(formSettings: string | null): SpamSettings {
  const defaults = getDefaultSpamSettings();
  if (!formSettings) return defaults;

  try {
    const settings = JSON.parse(formSettings) as { spam?: SpamSettings };
    const spam = settings.spam;
    if (!spam || typeof spam !== 'object') return defaults;

    const allowedDomains = Array.isArray(spam.allowedDomains)
      ? spam.allowedDomains.map(normalizeDomain).filter((d): d is string => Boolean(d))
      : defaults.allowedDomains;

    const parsed: SpamSettings = {
      honeypot: { ...defaults.honeypot, ...spam.honeypot },
      rateLimit: { ...defaults.rateLimit, ...spam.rateLimit },
      recaptcha: { ...defaults.recaptcha, ...spam.recaptcha },
      contentFilter: { ...defaults.contentFilter, ...spam.contentFilter },
      requireChallenge: spam.requireChallenge ?? defaults.requireChallenge,
      allowedDomains,
    };

    if (parsed.recaptcha?.enabled && !parsed.recaptcha.secretKey) {
      parsed.recaptcha.secretKey = process.env.RECAPTCHA_SECRET_KEY || '';
    }

    return parsed;
  } catch {
    return defaults;
  }
}

const EXPLICIT_HONEYPOTS = ['_honeypot', '_gotcha', 'honeypot'];

/**
 * True when a dedicated honeypot field was filled in.
 * Only checks explicit bot-trap names plus the configured field —
 * never generic names like "website" that real forms use.
 */
export function honeypotTriggered(
  data: Record<string, unknown>,
  fieldName: string
): boolean {
  const names = new Set([...EXPLICIT_HONEYPOTS, fieldName]);
  for (const name of names) {
    const value = data[name];
    if (typeof value === 'string' && value.trim() !== '') {
      return true;
    }
  }
  return false;
}

const URL_RE = /https?:\/\/[^\s<>"']+|www\.[^\s<>"']+/gi;

export function countLinks(data: Record<string, unknown>): number {
  let count = 0;
  const visit = (value: unknown) => {
    if (typeof value === 'string') {
      const matches = value.match(URL_RE);
      if (matches) count += matches.length;
    } else if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (value && typeof value === 'object') {
      Object.values(value as Record<string, unknown>).forEach(visit);
    }
  };
  visit(data);
  return count;
}

/** Strip protocol / www / port / path down to a hostname, or null if unusable. */
export function normalizeDomain(input: string): string | null {
  const raw = input.trim().toLowerCase();
  if (!raw) return null;

  try {
    const withProtocol = raw.includes('://') ? raw : `https://${raw}`;
    const hostname = new URL(withProtocol).hostname;
    if (!hostname) return null;
    return hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function hostnameFromUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  return normalizeDomain(value);
}

/**
 * If the form has an allowlist, the request Origin (or Referer) hostname
 * must match. Subdomains of an allowed domain are accepted.
 * Requests with no Origin/Referer are rejected when an allowlist is set
 * (blocks curl/bots hitting the endpoint from nowhere).
 */
export function isOriginAllowed(
  origin: string | null | undefined,
  referer: string | null | undefined,
  allowedDomains: string[]
): boolean {
  if (!allowedDomains.length) return true;

  const host = hostnameFromUrl(origin) || hostnameFromUrl(referer);
  if (!host) return false;

  return allowedDomains.some(
    (domain) => host === domain || host.endsWith(`.${domain}`)
  );
}

const SPAM_FIELDS = [
  '_honeypot',
  '_gotcha',
  'honeypot',
  'g-recaptcha-response',
  'recaptchaToken',
  '_recaptcha',
  '_redirect',
  '_subject',
  '_forma_token',
  '_challenge',
  '_t',
];

export function cleanSpamFields(data: Record<string, unknown>): Record<string, unknown> {
  const cleaned = { ...data };
  for (const field of SPAM_FIELDS) {
    delete cleaned[field];
  }
  return cleaned;
}

/** Hidden honeypot markup for HTML embeds. Off-screen, not display:none. */
export function honeypotHtml(fieldName = HONEYPOT_FIELD): string {
  return `<div aria-hidden="true" style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden">
  <label for="company_website">Company website</label>
  <input type="text" id="company_website" name="${fieldName}" tabindex="-1" autocomplete="off">
</div>`;
}

const EMBED_SKIP_TYPES = new Set(['page_break', 'hidden', 'image', 'video', 'payment']);

/** Copy-paste HTML embed with honeypot + optional protect.js. */
export function buildHtmlEmbed(options: {
  actionUrl: string;
  fields: Array<{ id: string; type: string; label: string }>;
  formId: string;
  scriptOrigin: string;
  honeypotField?: string;
}): string {
  const inputs = options.fields
    .filter((field) => !EMBED_SKIP_TYPES.has(field.type))
    .map((field) => {
      const inputType = field.type === 'textarea' ? 'text' : field.type;
      return `  <label>${field.label}</label>\n  <input type="${inputType}" name="${field.id}">`;
    })
    .join('\n');

  const honeypot = honeypotHtml(options.honeypotField)
    .split('\n')
    .map((line) => (line ? `  ${line}` : line))
    .join('\n');

  return `<form action="${options.actionUrl}" method="POST">
${inputs}
${honeypot}
  <button type="submit">Submit</button>
</form>
<script src="${options.scriptOrigin}/js/forma-protect.js" data-form="${options.formId}" defer></script>`;
}
