import { headers } from 'next/headers';
import { resolveHost } from '@/lib/domains/resolve';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Public blogs are tenant-hosted: /blog and /blog/[slug] resolve on any active
 * custom domain connected to the workspace (Settings > Custom Domains). Never fall
 * back to an arbitrary database workspace for an anonymous request.
 */
export async function resolvePublicBlogWorkspaceId(): Promise<string | null> {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host');
  if (!host) return null;

  const resolved = await resolveHost(host);
  return resolved?.workspaceId ?? null;
}

export const PLATFORM_PUBLIC_ORIGIN = 'https://www.leadsmind.io';

/**
 * Who the current request's public crawler files (robots.txt, sitemap.xml, rss.xml) belong to.
 * On a tenant's connected custom domain that is the tenant: its own workspace and its own origin.
 * Anywhere else (the platform's own domain) it is the platform-wide default.
 */
export async function resolvePublicSiteContext(): Promise<{
  workspaceId: string | null;
  origin: string;
}> {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host');
  const resolved = host ? await resolveHost(host) : null;
  if (!resolved) return { workspaceId: null, origin: PLATFORM_PUBLIC_ORIGIN };
  return { workspaceId: resolved.workspaceId, origin: `https://${resolved.hostname}` };
}

/**
 * Branding for a page served on a tenant's own domain: the owning workspace's name and the
 * domain's origin. Null on the platform's default domain, where the platform titles/canonicals
 * apply unchanged. Same host->workspace resolution (resolveHost) the blog data actions use.
 */
export async function resolveTenantSiteBrand(): Promise<{ workspaceName: string | null; origin: string } | null> {
  const { workspaceId, origin } = await resolvePublicSiteContext();
  if (!workspaceId) return null;
  const { data } = await createAdminClient()
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .maybeSingle();
  return { workspaceName: data?.name ?? null, origin };
}
