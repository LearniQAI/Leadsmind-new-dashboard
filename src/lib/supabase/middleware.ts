import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
 const host = request.headers.get('host') || ''
 const pathname = request.nextUrl.pathname

 const isBookSubdomain = host.toLowerCase().startsWith('book.leadsmind.io')
 const mainDomains = ['localhost', 'leadsmind.com', 'leadsmind.vercel.app', 'www.leadsmind.io', 'leadsmind.io', 'leadsmind-new-ui']
 const isCustomDomain = !mainDomains.some(domain => host.toLowerCase().includes(domain))

 // Subdomain & Custom Domain routing for public booking pages
 if ((isBookSubdomain || isCustomDomain) && !pathname.startsWith('/api') && !pathname.startsWith('/_next') && pathname !== '/favicon.ico') {
  if (!pathname.startsWith('/book')) {
   const url = request.nextUrl.clone()
   if (isCustomDomain) {
    url.pathname = `/book/domain/${host}${pathname}`
   } else {
    url.pathname = `/book${pathname}`
   }
   return NextResponse.rewrite(url)
  }
 }

 // NOTE (Custom-Domain Course Serving pass): a course-slug intercept used to live here,
 // keyed by workspace_branding.custom_domain. Removed after a real audit found it was a live
 // security gap, not just dead code: workspace_branding.custom_domain has zero real rows
 // today (confirmed live), so it never actually fired — but had it, the destination page
 // (/unauthenticated/courses/[slug]) never read the workspaceId/domain query params this
 // rewrite attached, and did a pure GLOBAL slug lookup. Any real row here would have let a
 // custom domain serve ANY workspace's course sharing that slug — a cross-workspace leak. The
 // real, current, actively-maintained custom-domain system is domain_configurations (Vercel-
 // backed DNS/SSL verification, src/lib/domains/verify.ts) — the outer src/middleware.ts now
 // handles custom-domain course serving through that system instead, scoped by the real FK
 // (courses.domain_id -> domain_configurations.id), which this old path never enforced.
 // The plain-platform-host /courses/[slug] rewrite (non-custom-domain case) also moved to the
 // outer middleware.ts (Default LeadsMind Domain pass) — this function no longer needs to
 // special-case /courses/ at all.

 // Build the response once from the current request state. The cookie
 // handlers below mutate this same `response` in place (via getAll/setAll)
 // instead of reassigning it — the old get/set/remove handlers created a
 // fresh NextResponse.next() on every individual cookie write, which
 // silently discarded any cookie set earlier in the same auth.getUser()
 // call (e.g. a refreshed access token cookie written before the refresh
 // token cookie), causing intermittent forced logouts / partial cookie state.
 let response = NextResponse.next({
  request: {
   headers: request.headers,
  },
 })

 const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
   auth: { flowType: 'pkce' },
   cookies: {
    getAll() {
     return request.cookies.getAll()
    },
    setAll(cookiesToSet) {
     // Mirror onto the request so any subsequent supabase call in this
     // invocation sees the fresh cookies, then rebuild the response from
     // that updated request and set all cookies on it in one pass.
     cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
     response = NextResponse.next({
      request: {
       headers: request.headers,
      },
     })
     cookiesToSet.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options)
     )
    },
   },
  }
 )

 const { data: { user } } = await supabase.auth.getUser()

 // Inactivity timeout check: 8 hours (28,800,000 ms)
 const INACTIVITY_TIMEOUT = 8 * 60 * 60 * 1000;
 const nowMs = Date.now();
 const lastActivity = request.cookies.get('last_activity_at')?.value;

 if (user && lastActivity) {
   const lastActivityTime = parseInt(lastActivity, 10);
   if (!isNaN(lastActivityTime) && nowMs - lastActivityTime > INACTIVITY_TIMEOUT) {
     await supabase.auth.signOut();
     const redirectUrl = request.nextUrl.pathname.startsWith('/portal')
       ? new URL('/auth/portal/login?error=Session expired due to inactivity', request.url)
       : new URL('/auth/signin-basic?error=Session expired due to inactivity', request.url);
     const res = NextResponse.redirect(redirectUrl);
     res.cookies.delete('last_activity_at');
     return res;
   }
 }

 // Update last activity cookie timestamp
 if (user) {
   response.cookies.set('last_activity_at', nowMs.toString(), {
     path: '/',
     httpOnly: true,
     sameSite: 'lax',
     maxAge: 8 * 60 * 60, // 8 hours in seconds
   });
 }

 const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
 
 // Define what should be public (landing pages, etc. if any)
 const isPublicPage =
   request.nextUrl.pathname === '/' ||
   isAuthPage ||
   request.nextUrl.pathname.startsWith('/_next') ||
   request.nextUrl.pathname.startsWith('/api') ||
   request.nextUrl.pathname === '/favicon.ico' ||
   request.nextUrl.pathname === '/privacy-policy' ||
   request.nextUrl.pathname === '/terms' ||
   request.nextUrl.pathname === '/refund' ||
   request.nextUrl.pathname.startsWith('/unauthenticated') ||
   // Public, guest-capable course checkout (src/app/checkout/[courseId]). The page itself
   // decides authed-vs-guest; it must be reachable logged-out so landing-page "Enrol" converts.
   request.nextUrl.pathname.startsWith('/checkout') ||
   request.nextUrl.pathname.startsWith('/public/forms') ||
   request.nextUrl.pathname.startsWith('/public/events') ||
   request.nextUrl.pathname.startsWith('/public/unsubscribe') ||
   request.nextUrl.pathname.startsWith('/p/') ||
   request.nextUrl.pathname.startsWith('/book') ||
   request.nextUrl.pathname.startsWith('/solutions') ||
   request.nextUrl.pathname.startsWith('/careers') ||
   request.nextUrl.pathname.startsWith('/docs') ||
   request.nextUrl.pathname.startsWith('/about')

 // If user is logged in and tries to access auth pages, redirect to dashboard
 if (user && isAuthPage) {
  return NextResponse.redirect(new URL('/dashboard', request.url))
 }

 // 2. If user is NOT logged in and tries to access ANY page that isn't public, redirect to login
 if (!user && !isPublicPage) {
  if (request.nextUrl.pathname.startsWith('/portal')) {
    return NextResponse.redirect(new URL('/auth/portal/login', request.url))
  }
  return NextResponse.redirect(new URL('/auth/signin-basic', request.url))
 }

 return response
}
