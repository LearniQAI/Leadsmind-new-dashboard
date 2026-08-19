import { createServerClient as _createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as _createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const createServerClient = async () => {
 let cookieStore;
 try {
  cookieStore = cookies()
 } catch (e) {
  // Graceful fallback for CLI / background scripts where requestAsyncStorage is not available
  return createAdminClient();
 }

 return _createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
   auth: { flowType: 'pkce' },
   // Same fix as createAdminClient() below, for the same documented reason
   // (see that function's comment): supabase-js's GET requests go through
   // Next.js's patched global fetch, which caches them by default even in a
   // dynamically-rendered route/Server Component, so a read immediately after
   // a write to the same table can replay the pre-write snapshot.
   global: {
    fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' } as RequestInit),
   },
   cookies: {
    get(name: string) {
     return cookieStore?.get(name)?.value
    },
    set(name: string, value: string, options: CookieOptions) {
     try {
      cookieStore?.set({ name, value, ...options })
     } catch {
      // The `set` method was called from a Server Component.
     }
    },
    remove(name: string, options: CookieOptions) {
     try {
      cookieStore?.set({ name, value: '', ...options })
     } catch {
      // The `remove` method was called from a Server Component.
     }
    },
   },
  }
 )
}

export const createAdminClient = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey || serviceKey.startsWith('your_')) {
    throw new Error('[FATAL] SUPABASE_SERVICE_ROLE_KEY is not configured')
  }

  return _createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      // Without this, supabase-js's GET requests go through Next.js's patched
      // global fetch, which caches them by default in a Route Handler.
      // executor.ts's processNextStep recurses by writing a row then
      // immediately re-fetching it in the next call -- with the default
      // cache, that re-fetch returned the pre-write snapshot every time,
      // so a resumed wait step re-read its own already-cleared resume_at
      // forever and tripped the loop-protection guard. Confirmed live: a
      // wait -> send_email -> wait chain never advanced past the first wait
      // until this was added.
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' } as RequestInit),
      },
    }
  );
}

export const createClient = createServerClient;
