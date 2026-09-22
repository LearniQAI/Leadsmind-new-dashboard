import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { resolveHost, resolveWebsiteHost, isTrackingDomain } from '@/lib/domains/resolve'
import { createAdminClient } from '@/lib/supabase/server'
import { PLATFORM_HOSTS } from '@/lib/domains/platformHosts'
import { isCustomDomainPassthrough } from '@/lib/domains/customDomainRoutes'

// Website-builder custom domains rewrite every path to the site's own /p/... route; only these
// stay reachable so forms/assets keep working. (Course/blog/portal domains use the explicit
// allowlist in lib/domains/customDomainRoutes.ts instead.)
const RESERVED_ROOT_PATHS = new Set(['api', '_next', 'favicon.ico', 'book'])

// Real 404 (an actual 404 status, not the app's soft-404 page which answers 200) for a path a
// custom domain does not serve — never guessed into another feature. Self-contained HTML so it
// carries no platform chrome or staff links onto a customer's domain.
function customDomainNotFound() {
  const html =
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Page not found</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;' +
    'font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;color:#0f172a;text-align:center}' +
    'h1{font-size:64px;margin:0}p{color:#64748b;margin:8px 0 20px}a{color:#4f46e5}</style></head>' +
    '<body><main><h1>404</h1><p>This page could not be found.</p><a href="/">Go to the home page</a></main></body></html>'
  return new NextResponse(html, {
    status: 404,
    headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex' },
  })
}

export async function middleware(request: NextRequest) {
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase()

  // 1. Tracking-number pages (e.g. track.leadsmind.io/uuid -> /track/uuid). Fires only on the
  // platform's own track.* hosts or on a tracking domain a workspace has actually registered
  // (courier_brand_settings.custom_track_domain) — never on an ordinary tenant domain, where an
  // 8+ letter path such as /services or /photography is a page or course, not a tracking number.
  const isTrackHost = host === 'track.leadsmind.io' || host === 'track.leadsmind.com' || host.startsWith('track.')
  const path = request.nextUrl.pathname
  const segments = path.split('/').filter(Boolean)

  if (segments.length === 1) {
    const segment = segments[0]
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)
    const isTrackingNumber = /^[A-Z0-9]{8,25}$/i.test(segment)

    if (isUuid || isTrackingNumber) {
      if (isTrackHost || (!PLATFORM_HOSTS.has(host) && await isTrackingDomain(host))) {
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
  // shape. Reserved static children of /courses are excluded so this can never intercept an
  // existing real page — and a UUID second segment is left alone too, since that's the existing
  // internal /courses/[id] admin route, not a public slug.
  //
  // Kept in sync with the real folders under src/app/courses/ (everything that isn't [id]):
  // certificates, components, utils, needs-grading, audio-library, speakers. "needs-grading"
  // was missing here — the real cross-course assignment inbox at
  // src/app/courses/needs-grading/page.tsx existed and worked, but every request to it was
  // rewritten to /unauthenticated/courses/needs-grading (treating "needs-grading" as a public
  // course slug) and 404'd before Next's own router ever got a chance to match the real static
  // route. Confirmed live: the "Needs grading" button on /courses linked here and hit exactly
  // this 404. audio-library and speakers (Phase 3 Part B's Audio Library / Speaker Library
  // screens) hit the exact same bug live during that phase's own build — added here rather
  // than repeating it a third time.
  const RESERVED_COURSES_SEGMENTS = new Set([
    'certificates', 'components', 'utils', 'needs-grading', 'audio-library', 'speakers',
  ])
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
    // Only a real, verified (status='active') domain reaches here: resolveHost() returns null
    // for 'pending'/'verifying' hostnames. domainConfigId is null for the free
    // {slug}.leadsmind.com subdomain case, which keeps its prior pass-through behavior.
    //
    // On a connected domain the served surfaces are an EXPLICIT ALLOWLIST (see
    // lib/domains/customDomainRoutes.ts): the allowlisted roots pass through untouched, the root
    // path shows the domain's course(s), and a single other segment is served only if it is a
    // real course url_path on THIS domain. Anything else — including staff tooling such as
    // /dashboard or /settings, which intentionally stays on the platform's own domain — is a
    // genuine 404. Nothing is guessed into a course, a tracking number or a booking page.
    if (resolved.domainConfigId && !isCustomDomainPassthrough(path)) {
      const domainConfigId = resolved.domainConfigId
      const adminClient = createAdminClient()

      if (segments.length === 0) {
        // Root path: rewrite straight to the domain's one course if it only has one, or a
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
        // /{url_path} -> the real course landing page, but only on a POSITIVE match: a course
        // on this exact domain (courses.domain_id + url_path). The page itself still decides
        // published-vs-preview; the domain scope travels in the x-domain-config-id header.
        const { data: course } = await adminClient
          .from('courses')
          .select('url_path')
          .eq('domain_id', domainConfigId)
          .eq('url_path', segments[0].toLowerCase())
          .maybeSingle()
        if (!course?.url_path) return customDomainNotFound()

        const url = request.nextUrl.clone()
        url.pathname = `/unauthenticated/courses/${course.url_path}`
        const headers = new Headers(request.headers)
        headers.set('x-domain-config-id', domainConfigId)
        return NextResponse.rewrite(url, { request: { headers } })
      }

      return customDomainNotFound()
    }

    const res = await updateSession(request)
    res.headers.set('x-workspace-id', resolved.workspaceId)
    res.headers.set('x-tenant-host', resolved.hostname)
    return res
  }

  // Website-builder custom domain (builder_published_domains): a verified domain on a published
  // website serves that site through the same /p/{workspaceSlug}/{subdomain}[/{page}] route the
  // default leadsmind URL uses. Checked only after resolveHost() (courses/blog) found nothing.
  if (!RESERVED_ROOT_PATHS.has(segments[0] || '')) {
    const site = await resolveWebsiteHost(host)
    if (site) {
      const ownPrefix = `/p/${site.workspaceSlug}/${site.subdomain}`
      const url = request.nextUrl.clone()

      // The renderer builds internal links as /p/{workspaceSlug}/{subdomain}/{page}. On the
      // site's own domain, strip that prefix (redirect to the clean URL) instead of
      // double-prefixing it; any other /p/... path is another site's content and is never
      // served on this host.
      if (path === ownPrefix || path.startsWith(`${ownPrefix}/`)) {
        url.pathname = path.slice(ownPrefix.length) || '/'
        return NextResponse.redirect(url, 308)
      }
      if (path === '/p' || path.startsWith('/p/')) {
        return new NextResponse('Not found', { status: 404 })
      }

      url.pathname = `${ownPrefix}${path === '/' ? '' : path}`
      return NextResponse.rewrite(url)
    }
  }

  // Unknown host -> behave as platform (no tenant context).
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
