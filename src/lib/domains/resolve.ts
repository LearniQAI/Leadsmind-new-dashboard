import { createAdminClient } from '@/lib/supabase/server'

const ROOT = 'leadsmind.com'
const RESERVED = new Set(['www', 'app', 'api', 'track', 'domains', 'apex', ''])

export interface Resolved { workspaceId: string; hostname: string; routing: Record<string, string>; domainConfigId: string | null }

/**
 * True only when the host is a tracking domain a workspace has actually registered
 * (courier_brand_settings.custom_track_domain, set in Shipments). The tracking-number rewrite in
 * middleware is gated on this so it can never fire on an ordinary tenant domain, where an
 * 8+ letter path like /services or /photography is just a page or course.
 */
export async function isTrackingDomain(host: string): Promise<boolean> {
  const hostname = host.split(':')[0].toLowerCase().trim()
  if (!hostname) return false
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('courier_brand_settings')
    .select('workspace_id')
    .eq('custom_track_domain', hostname)
    .limit(1)
  return !!data && data.length > 0
}

export interface ResolvedWebsite { workspaceSlug: string; subdomain: string }

/**
 * Website-builder custom domains (builder_published_domains). Only consulted after resolveHost()
 * finds nothing for the host, so a host can never serve both a course/blog domain and a website.
 * Requires the domain to have passed the real DNS/SSL check (verified) AND the website to be
 * published, and the domain row's workspace must match the website's workspace — a domain row
 * pointing at another workspace's website resolves to nothing.
 */
export async function resolveWebsiteHost(host: string): Promise<ResolvedWebsite | null> {
  const hostname = host.split(':')[0].toLowerCase().trim()
  if (!hostname) return null

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('builder_published_domains')
    .select('workspace_id, verified, websites!inner(subdomain, is_published, workspace_id, workspaces(slug))')
    .eq('domain_name', hostname)
    .eq('verified', true)
    .not('ownership_verified_at', 'is', null)
    .maybeSingle()

  const site: any = Array.isArray((data as any)?.websites) ? (data as any).websites[0] : (data as any)?.websites
  const ws: any = Array.isArray(site?.workspaces) ? site.workspaces[0] : site?.workspaces
  if (!data || !data.verified || !site?.is_published || !site.subdomain || !ws?.slug) return null
  if (site.workspace_id !== data.workspace_id) return null
  return { workspaceSlug: ws.slug, subdomain: site.subdomain }
}

/** Resolve an inbound Host header to a workspace. Returns null for the platform's own hosts. */
export async function resolveHost(host: string): Promise<Resolved | null> {
  const hostname = host.split(':')[0].toLowerCase().trim()
  if (!hostname || hostname === ROOT) return null

  const supabase = createAdminClient()

  // 1) {slug}.leadsmind.com free subdomain
  if (hostname.endsWith(`.${ROOT}`)) {
    const sub = hostname.slice(0, -1 * (`.${ROOT}`).length)
    if (RESERVED.has(sub)) return null
    const { data: ws } = await supabase.from('workspaces').select('id').eq('slug', sub).maybeSingle()
    if (ws) return { workspaceId: ws.id, hostname, routing: {}, domainConfigId: null }
    return null
  }

  // 2) custom domain mapped in domain_configurations (active only — a 'pending'/'verifying'
  // domain must never be able to serve anything, its DNS/SSL isn't confirmed real yet).
  const { data: dc } = await supabase
    .from('domain_configurations')
    .select('id, workspace_id, routing_config, status')
    .eq('hostname', hostname)
    .eq('status', 'active')
    .not('ownership_verified_at', 'is', null)
    .maybeSingle()
  if (dc && dc.status === 'active') {
    // Custom-Domain Course Serving pass — the domain_configurations row's own id is the real
    // FK courses.domain_id points at, so course lookups can be scoped to exactly this domain
    // (never a loose workspace_id-only match, which would let any course with a matching
    // url_path from ANY of the workspace's domains leak onto this one).
    return { workspaceId: dc.workspace_id, hostname, routing: (dc.routing_config as any) || {}, domainConfigId: dc.id }
  }
  return null
}
