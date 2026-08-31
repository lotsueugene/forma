/**
 * Content heuristics for contact-form spam that has no links:
 * random-letter names, dotted Gmail aliases, phone-number "messages".
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MESSAGE_KEYS = /^(message|msg|comment|comments|body|enquiry|inquiry|description|details|subject|note|notes)$/i;

export const SPAM_CONTENT_THRESHOLD = 4;

function stringFields(data: Record<string, unknown>): Array<{ key: string; value: string }> {
  const out: Array<{ key: string; value: string }> = [];
  for (const [key, raw] of Object.entries(data)) {
    if (typeof raw === 'string' && raw.trim()) {
      out.push({ key, value: raw.trim() });
    }
  }
  return out;
}

/** Gmail (and similar) aliases with lots of dots — t.a.mm.yow.ens.4.25.8@gmail.com */
export function isSuspiciousEmail(value: string): boolean {
  if (!EMAIL_RE.test(value)) return false;
  const [local, domain = ''] = value.split('@');
  const dots = (local.match(/\./g) || []).length;
  const host = domain.toLowerCase();
  if ((host === 'gmail.com' || host === 'googlemail.com') && dots >= 4) return true;
  if (dots >= 6) return true;
  return false;
}

/** Digits-only payload that looks like a phone number, not a real message. */
export function isPhoneOnly(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return false;
  const stripped = value.replace(/[\s.\-()+]/g, '');
  return stripped === digits;
}

function letterRuns(value: string): string {
  return value.replace(/[^a-zA-Z]/g, '');
}

/**
 * Random mixed-case Latin with no spaces, e.g. CToJbXBvxinLenJUX.
 * Skips CJK / accented / Cyrillic names.
 */
export function isGibberish(value: string): boolean {
  const s = value.trim();
  if (s.length < 10 || s.length > 80) return false;
  if (/[^\u0000-\u007F]/.test(s)) return false;
  if (EMAIL_RE.test(s) || isPhoneOnly(s)) return false;

  const words = s.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words.filter((word) => wordIsGibberish(word)).length >= 2;
  }
  return wordIsGibberish(s);
}

function wordIsGibberish(word: string): boolean {
  const letters = letterRuns(word);
  if (letters.length < 10) return false;

  const vowels = (letters.match(/[aeiouAEIOU]/g) || []).length;
  const vowelRatio = vowels / letters.length;
  if (vowelRatio < 0.12) return true;

  let switches = 0;
  for (let i = 1; i < letters.length; i++) {
    const prevUpper = letters[i - 1] === letters[i - 1].toUpperCase();
    const nextUpper = letters[i] === letters[i].toUpperCase();
    if (prevUpper !== nextUpper) switches++;
  }
  const switchRatio = switches / (letters.length - 1);
  if (letters.length >= 12 && switchRatio >= 0.4) return true;

  if (/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]{5,}/.test(letters)) return true;

  return false;
}

export function scoreSpamContent(data: Record<string, unknown>): number {
  const fields = stringFields(data);
  let score = 0;
  let phoneFields = 0;

  for (const { key, value } of fields) {
    if (isSuspiciousEmail(value)) {
      score += 2;
      continue;
    }
    if (isGibberish(value)) {
      score += 3;
      continue;
    }
    if (isPhoneOnly(value)) {
      phoneFields += 1;
      if (MESSAGE_KEYS.test(key)) score += 2;
    }
  }

  // Name + phone in message is the usual "lead" spam shape even without a dotted email
  if (phoneFields >= 2) score += 1;

  return score;
}

export function isSpammySubmission(data: Record<string, unknown>, threshold = SPAM_CONTENT_THRESHOLD): boolean {
  return scoreSpamContent(data) >= threshold;
}
