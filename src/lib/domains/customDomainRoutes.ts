// Single source of truth for which paths a tenant's active custom domain serves as real app
// routes, versus paths it treats as a course url_path. Used by src/middleware.ts (routing) and by
// course creation (reserving the words), so the two can never drift apart.
//
// Only customer/student-facing surfaces are white-labelled. Staff tooling (/dashboard, /settings,
// /contacts, ...) is deliberately NOT here: it stays on the platform's own domain, so on a custom
// domain those paths are a genuine 404 rather than being guessed into something else.

/** First path segments that pass through to the app untouched on an active custom domain. */
export const CUSTOM_DOMAIN_PASSTHROUGH_ROOTS: readonly string[] = [
  'blog',
  'checkout',
  'preview',       // /preview/courses/*
  'certificates',  // /certificates/verify/*
  'public',
  'book',
  'api',
  '_next',
  'student',
  'portal',
  'auth',
  'meet',
  'widget',
];

/** Exact single-segment files served untouched. */
export const CUSTOM_DOMAIN_PASSTHROUGH_FILES: readonly string[] = [
  'rss.xml',
  'sitemap.xml',
  'robots.txt',
  'favicon.ico',
];

const ROOTS = new Set(CUSTOM_DOMAIN_PASSTHROUGH_ROOTS);
const FILES = new Set(CUSTOM_DOMAIN_PASSTHROUGH_FILES);

/** True when the request path should reach the app as-is on a resolved custom domain. */
export function isCustomDomainPassthrough(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return false;
  const first = segments[0].toLowerCase();
  if (ROOTS.has(first)) return true;
  return segments.length === 1 && FILES.has(first);
}

/**
 * A course url_path is served at /{url_path} on the domain, so it must never equal a path the
 * domain serves for something else. Checked at course creation.
 */
export function isReservedCoursePath(urlPath: string): boolean {
  const value = urlPath.trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  return ROOTS.has(value) || FILES.has(value);
}
