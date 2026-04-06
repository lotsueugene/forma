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
