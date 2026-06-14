import { createAdminClient } from '@/lib/supabase/server'

const ROOT = 'leadsmind.com'
const RESERVED = new Set(['www', 'app', 'api', 'track', 'domains', 'apex', ''])

export interface Resolved { workspaceId: string; hostname: string; routing: Record<string, string> }

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
    if (ws) return { workspaceId: ws.id, hostname, routing: {} }
    return null
  }

  // 2) custom domain mapped in domain_configurations (active only)
  const { data: dc } = await supabase
    .from('domain_configurations')
    .select('workspace_id, routing_config, status')
    .eq('hostname', hostname).maybeSingle()
  if (dc && dc.status === 'active') {
    return { workspaceId: dc.workspace_id, hostname, routing: (dc.routing_config as any) || {} }
  }
  return null
}
