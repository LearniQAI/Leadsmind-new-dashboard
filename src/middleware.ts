import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { resolveHost } from '@/lib/domains/resolve'
import { createAdminClient } from '@/lib/supabase/server'

// Never rewritten to course-serving on a custom domain, even though they're a single path
// segment — real app-internal paths that could in principle be requested against a custom
// domain host (e.g. a same-origin fetch that didn't get proxied correctly) must never be
// swallowed by the course lookup.
const RESERVED_ROOT_PATHS = new Set(['api', '_next', 'favicon.ico', 'book'])

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

  // 1b. Default-domain public course URL (leadsmind.io/courses/{slug} -> the real published
  // student-facing landing page at /unauthenticated/courses/{slug}). Added for the New Course
  // modal's default-domain option — that page already exists and already works by slug, this
  // just gives it the clean URL a student actually sees, instead of the internal admin route
  // shape. Reserved static children of /courses (currently just "certificates", the real admin
  // page at src/app/courses/certificates/page.tsx) are excluded so this can never intercept an
  // existing real page — and a UUID second segment is left alone too, since that's the existing
  // internal /courses/[id] admin route, not a public slug.
  const RESERVED_COURSES_SEGMENTS = new Set(['certificates', 'components', 'utils'])
  if (
    segments.length === 2 &&
    segments[0] === 'courses' &&
    PLATFORM_HOSTS.has(host) &&
    !RESERVED_COURSES_SEGMENTS.has(segments[1]) &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segments[1])
  ) {
    const url = request.nextUrl.clone()
    url.pathname = `/unauthenticated/courses/${segments[1]}`
    return NextResponse.rewrite(url)
  }

  // Platform hosts behave exactly as before.
  if (PLATFORM_HOSTS.has(host)) {
    return await updateSession(request)
  }

  // Custom/sub domain: resolve to a workspace, inject context, then continue normal auth.
  const resolved = await resolveHost(host)
  if (resolved) {
    // Custom-Domain Course Serving — only a real, verified (status='active') domain reaches
    // here at all: resolveHost() already returns null for 'pending'/'verifying' hostnames, so
    // there is no path to reach any of this without real DNS/SSL verification. domainConfigId
    // is null for the free {slug}.leadsmind.com subdomain case (no course-domain concept
    // there yet), so this whole block is skipped for that and it keeps its prior behavior.
    if (resolved.domainConfigId && !RESERVED_ROOT_PATHS.has(segments[0] || '')) {
      const domainConfigId = resolved.domainConfigId
      const adminClient = createAdminClient()

      if (segments.length === 0) {
        // Root path: redirect straight to the domain's one course if it only has one, or a
        // real portal listing every course otherwise — never a blank/broken root.
        const { data: courses } = await adminClient
          .from('courses')
          .select('url_path')
          .eq('domain_id', domainConfigId)
          .not('url_path', 'is', null)
          .or('published.eq.true,status.eq.published')

        const url = request.nextUrl.clone()
        if (courses && courses.length === 1) {
          url.pathname = `/unauthenticated/courses/${courses[0].url_path}`
        } else {
          url.pathname = '/unauthenticated/domain-portal'
        }
        const headers = new Headers(request.headers)
        headers.set('x-domain-config-id', domainConfigId)
        return NextResponse.rewrite(url, { request: { headers } })
      }

      if (segments.length === 1) {
        // /{url_path} -> the same real course landing page the default-domain path uses,
        // scoped to this exact domain via the x-domain-config-id request header (read by
        // /unauthenticated/courses/[slug]/page.tsx) — never a global slug lookup here.
        const url = request.nextUrl.clone()
        url.pathname = `/unauthenticated/courses/${segments[0]}`
        const headers = new Headers(request.headers)
        headers.set('x-domain-config-id', domainConfigId)
        return NextResponse.rewrite(url, { request: { headers } })
      }
    }

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
