import { headers } from 'next/headers';
import { resolveHost } from '@/lib/domains/resolve';

/**
 * Public blogs are tenant-hosted: /blog and /blog/[slug] resolve on either an
 * active custom domain or {workspace-slug}.leadsmind.com. Never fall back to
 * an arbitrary database workspace for an anonymous request.
 */
export async function resolvePublicBlogWorkspaceId(): Promise<string | null> {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host');
  if (!host) return null;

  const resolved = await resolveHost(host);
  return resolved?.workspaceId ?? null;
}
