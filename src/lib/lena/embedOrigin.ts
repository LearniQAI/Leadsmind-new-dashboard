import type { NextRequest } from 'next/server';
import { requestOrigin } from './publicSession';

const PLATFORM_HOSTS = new Set(['leadsmind.com', 'www.leadsmind.com', 'leadsmind.io', 'www.leadsmind.io', 'leadsmind.vercel.app']);

function localhostAllowed(hostname: string) {
  return process.env.NODE_ENV !== 'production' && (hostname === 'localhost' || hostname === '127.0.0.1');
}

export async function validateLenaEmbedOrigin(admin: any, req: NextRequest, workspaceId: string) {
  const origin = requestOrigin(req);
  if (!origin) return null;
  const hostname = new URL(origin).hostname.toLowerCase();
  if (localhostAllowed(hostname)) return origin;

  const { data: domain, error } = await admin
    .from('domain_configurations')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('hostname', hostname)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw error;
  if (domain) return origin;

  // A workspace's provisioned LeadsMind subdomain is also a valid embed origin.
  if (hostname.endsWith('.leadsmind.com')) {
    const slug = hostname.slice(0, -'.leadsmind.com'.length);
    const { data: workspace, error: workspaceError } = await admin.from('workspaces').select('id').eq('id', workspaceId).eq('slug', slug).maybeSingle();
    if (workspaceError) throw workspaceError;
    if (workspace) return origin;
  }
  return null;
}

export async function validateAnyLenaEmbedOrigin(admin: any, req: NextRequest) {
  const origin = requestOrigin(req);
  if (!origin) return null;
  const hostname = new URL(origin).hostname.toLowerCase();
  if (localhostAllowed(hostname) || PLATFORM_HOSTS.has(hostname) || hostname.endsWith('.leadsmind.com')) return origin;
  const { data, error } = await admin.from('domain_configurations').select('id').eq('hostname', hostname).eq('status', 'active').maybeSingle();
  if (error) throw error;
  return data ? origin : null;
}

export function lenaCorsHeaders(origin: string | null, methods: string) {
  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Lena-Visitor-Session',
  };
}
