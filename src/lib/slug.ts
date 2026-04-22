/**
 * Shared helpers for form slugs used on custom domains.
 *
 * A form's `slug` and `bookingSlug` become path segments under the workspace's
 * verified custom domain (e.g. `forms.acme.com/<slug>`). They must therefore
 * avoid collisions with the app's own route space and be normalised the same
 * way on the client (as the user types) and the server (on save).
 */

/**
 * Reserved slugs. Intentionally tiny — only the paths that the custom-domain
 * middleware explicitly bypasses, so choosing one of these as a slug would
 * silently never resolve on the user's custom domain.
 *
 * We do NOT reserve generic app-route names like "admin", "login", or
 * "dashboard": slugs live on the workspace's *own* custom domain, where the
 * app's admin/login/etc. routes don't exist — the middleware rewrites every
 * path to the form resolver. Reserving those would be imposing our opinions
 * on the user's URL space for no real collision.
 *
 * See forma/src/middleware.ts for the definitive skip list.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'api',
  '_next',
  'static',
]);

/**
 * Normalise a user-provided slug to the canonical form we store.
 * Lowercases, strips invalid chars, collapses dashes, and trims.
 * Returns null for empty input so callers can explicitly clear a slug.
 */
export function normalizeSlug(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const str = String(raw)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return str || null;
}

/**
 * Validate a normalised slug. Returns an error message, or null if OK.
 * Callers should pass the *normalised* value.
 */
export function validateSlug(slug: string | null, label = 'Slug'): string | null {
  if (!slug) return null;
  if (slug.length < 2) return `${label} must be at least 2 characters.`;
  if (slug.length > 64) return `${label} must be at most 64 characters.`;
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) {
    return `${label} must start and end with a letter or number.`;
  }
  if (RESERVED_SLUGS.has(slug)) {
    return `"${slug}" is reserved and can't be used as a ${label.toLowerCase()}.`;
  }
  return null;
}

/** Number of days an old slug keeps redirecting after a rename. */
export const SLUG_REDIRECT_GRACE_DAYS = 14;

/** Compute the expiry timestamp for a new slug-redirect entry. */
export function slugRedirectExpiresAt(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + SLUG_REDIRECT_GRACE_DAYS);
  return d;
}
