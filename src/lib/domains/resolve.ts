import { createAdminClient } from '@/lib/supabase/server'

const ROOT = 'leadsmind.com'
const RESERVED = new Set(['www', 'app', 'api', 'track', 'domains', 'apex', ''])

export interface Resolved { workspaceId: string; hostname: string; routing: Record<string, string>; domainConfigId: string | null }

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
    .eq('hostname', hostname).maybeSingle()
  if (dc && dc.status === 'active') {
    // Custom-Domain Course Serving pass — the domain_configurations row's own id is the real
    // FK courses.domain_id points at, so course lookups can be scoped to exactly this domain
    // (never a loose workspace_id-only match, which would let any course with a matching
    // url_path from ANY of the workspace's domains leak onto this one).
    return { workspaceId: dc.workspace_id, hostname, routing: (dc.routing_config as any) || {}, domainConfigId: dc.id }
  }
  return null
}
