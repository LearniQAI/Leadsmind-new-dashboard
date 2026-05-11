import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
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
 // For now, only /auth is public. Everything else is protected.
 const isPublicPage = isAuthPage || 
            request.nextUrl.pathname.startsWith('/_next') || 
            request.nextUrl.pathname.startsWith('/api') ||
            request.nextUrl.pathname === '/favicon.ico'

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
