// Single source of truth for a course's real public URL. Pure (no server imports) so client
// components can use it; the DB lookup lives in coursePublicUrl.server.ts.
//
// A course bound to a connected custom domain is served at https://{hostname}/{url_path}; any
// other course lives on the platform at {platformOrigin}/courses/{slug}. Only an ACTIVE domain
// counts as bound (middleware never serves a pending/verifying hostname).

export interface CourseUrlInput {
  /** Hostname of the course's domain_configurations row, only when that row is active. */
  hostname?: string | null;
  urlPath?: string | null;
  slug?: string | null;
  platformOrigin: string;
}

const stripSlash = (s: string) => s.replace(/\/+$/, '');

/** Origin every link for this course should use: its custom domain if bound, else the platform. */
export function courseOrigin({ hostname, platformOrigin }: Pick<CourseUrlInput, 'hostname' | 'platformOrigin'>): string {
  return hostname ? `https://${hostname}` : stripSlash(platformOrigin);
}

/** The course's public landing-page URL, or null when it has no live URL yet. */
export function courseLandingUrl(input: CourseUrlInput): string | null {
  const { hostname, urlPath, slug, platformOrigin } = input;
  if (hostname && urlPath) return `https://${hostname}/${urlPath.replace(/^\/+/, '')}`;
  if (slug) return `${stripSlash(platformOrigin)}/courses/${slug}`;
  return null;
}

/** Platform origin from env; the caller supplies a browser fallback where one exists. */
export function platformOriginFromEnv(fallback = 'http://localhost:3000'): string {
  return stripSlash(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || fallback);
}
