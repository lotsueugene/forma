import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';

// Configure marked for safe defaults
marked.setOptions({
  gfm: true,
  breaks: false,
});

// Configure DOMPurify to allow safe HTML elements
const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'ul', 'ol', 'li',
  'strong', 'b', 'em', 'i', 'u', 's',
  'a', 'code', 'pre',
  'blockquote',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const ALLOWED_ATTR = [
  'href', 'target', 'rel', 'class',
];

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Convert markdown to HTML and sanitize the output.
 * Uses the 'marked' library for proper GFM (GitHub Flavored Markdown) support
 * including tables, task lists, strikethrough, etc.
 */
export function markdownToSafeHtml(content: string): string {
  const rawHtml = marked.parse(content, { async: false }) as string;
  return sanitizeHtml(rawHtml);
}

// Hex colors only: #RGB, #RGBA, #RRGGBB, #RRGGBBAA. Used to gate any
// user-supplied color before it lands in a <style> block or inline style.
// Anything that isn't a clean hex collapses to the fallback so attackers
// can't break out of the CSS value via `;` / `}` / `url(...)` / etc.
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function safeCssColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return HEX_COLOR_RE.test(trimmed) ? trimmed : fallback;
}

// Reject `javascript:`, `data:`, `vbscript:` and other non-navigation schemes
// before passing a form-owner-controlled URL to `window.location.href`.
// Without this, a malicious form owner can set thankYou.redirectUrl to a
// `javascript:` URI and run arbitrary JS in the form's origin against any
// respondent who submits.
export function safeRedirectUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Allow protocol-relative and root-relative paths as same-origin nav.
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:' ? trimmed : null;
  } catch {
    return null;
  }
}
