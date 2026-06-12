import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
 const host = request.headers.get('host') || ''
 const pathname = request.nextUrl.pathname

 const mainDomains = ['localhost', 'leadsmind.com', 'leadsmind.vercel.app', 'www.leadsmind.io', 'leadsmind-new-ui']
 const isCustomDomain = !mainDomains.some(domain => host.toLowerCase().includes(domain))

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

 const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
 
 // Define what should be public (landing pages, etc. if any)
 // For now, only /auth, /privacy-policy, /terms, and /unauthenticated/ are public.
 const isPublicPage = isAuthPage || 
            request.nextUrl.pathname.startsWith('/_next') || 
            request.nextUrl.pathname.startsWith('/api') ||
            request.nextUrl.pathname === '/favicon.ico' ||
            request.nextUrl.pathname === '/privacy-policy' ||
            request.nextUrl.pathname === '/terms' ||
            request.nextUrl.pathname.startsWith('/unauthenticated')

 // 1. If user is logged in and tries to access auth pages, redirect to root
 if (user && isAuthPage) {
  return NextResponse.redirect(new URL('/', request.url))
 }

 // 2. If user is NOT logged in and tries to access ANY page that isn't public, redirect to login
 if (!user && !isPublicPage) {
  return NextResponse.redirect(new URL('/auth/signin-basic', request.url))
 }

 return response
}
