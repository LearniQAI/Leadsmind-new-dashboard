import { createServerClient, type CookieOptions } from '@supabase/ssr'
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

 // Intercept course slug pages (/courses/[slug] where [slug] is not a UUID)
 if (pathname.startsWith('/courses/')) {
  const segment = pathname.split('/')[2]
  if (segment) {
   const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(segment)
   if (!isUuid) {
    if (isCustomDomain) {
     const tempSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
       cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set() {},
        remove() {}
       }
      }
     )
     const { data } = await tempSupabase
      .from('workspace_branding')
      .select('workspace_id')
      .eq('custom_domain', host)
      .maybeSingle()

     const workspaceId = data?.workspace_id || ''
     return NextResponse.rewrite(
      new URL(`/unauthenticated/courses/${segment}?workspaceId=${workspaceId}&domain=${host}`, request.url)
     )
    } else {
     return NextResponse.rewrite(
      new URL(`/unauthenticated/courses/${segment}`, request.url)
     )
    }
   }
  }
 }

 let response = NextResponse.next({
  request: {
   headers: request.headers,
  },
 })

 const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
   cookies: {
    get(name: string) {
     return request.cookies.get(name)?.value
    },
    set(name: string, value: string, options: CookieOptions) {
     request.cookies.set({
      name,
      value,
      ...options,
     })
     response = NextResponse.next({
      request: {
       headers: request.headers,
      },
     })
     response.cookies.set({
      name,
      value,
      ...options,
     })
    },
    remove(name: string, options: CookieOptions) {
     request.cookies.set({
      name,
      value: '',
      ...options,
     })
     response = NextResponse.next({
      request: {
       headers: request.headers,
      },
     })
     response.cookies.set({
      name,
      value: '',
      ...options,
     })
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
 // For now, only /auth, /privacy-policy, /terms, and /unauthenticated/ are public.
 const isPublicPage = isAuthPage || 
            request.nextUrl.pathname.startsWith('/_next') || 
            request.nextUrl.pathname.startsWith('/api') ||
            request.nextUrl.pathname === '/favicon.ico' ||
            request.nextUrl.pathname === '/privacy-policy' ||
            request.nextUrl.pathname === '/terms' ||
            request.nextUrl.pathname.startsWith('/unauthenticated') ||
            request.nextUrl.pathname.startsWith('/book')

 // 1. If user is logged in and tries to access auth pages, redirect to root
 if (user && isAuthPage) {
  return NextResponse.redirect(new URL('/', request.url))
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
