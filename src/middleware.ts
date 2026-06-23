import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { resolveHost } from '@/lib/domains/resolve'

const PLATFORM_HOSTS = new Set([
  'leadsmind.com',
  'www.leadsmind.com',
  'app.leadsmind.com',
  'leadsmind.io',
  'www.leadsmind.io',
  'app.leadsmind.io',
  'localhost'
])

export async function middleware(request: NextRequest) {
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase()

  // 1. Custom tracking domains rewrite (e.g. track.leadsmind.io/uuid -> /track/uuid)
  const isTrackHost = host === 'track.leadsmind.io' || host === 'track.leadsmind.com' || host.startsWith('track.')
  const path = request.nextUrl.pathname
  const segments = path.split('/').filter(Boolean)
  
  if (segments.length === 1) {
    const segment = segments[0]
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)
    const isTrackingNumber = /^[A-Z0-9]{8,25}$/i.test(segment)
    
    if (isUuid || isTrackingNumber) {
      if (isTrackHost || !PLATFORM_HOSTS.has(host)) {
        const url = request.nextUrl.clone()
        url.pathname = `/track/${segment}`
        return NextResponse.rewrite(url)
      }
    }
  }

  // Platform hosts behave exactly as before.
  if (PLATFORM_HOSTS.has(host)) {
    return await updateSession(request)
  }

  // Custom/sub domain: resolve to a workspace, inject context, then continue normal auth.
  const resolved = await resolveHost(host)
  if (resolved) {
    const res = await updateSession(request)
    res.headers.set('x-workspace-id', resolved.workspaceId)
    res.headers.set('x-tenant-host', resolved.hostname)
    return res
  }

  // Unknown host -> behave as platform (no tenant context).
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
