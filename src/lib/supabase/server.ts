import { createServerClient as _createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as _createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const createServerClient = async () => {
 const cookieStore = cookies()

 return _createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
   cookies: {
    get(name: string) {
     return cookieStore.get(name)?.value
    },
    set(name: string, value: string, options: CookieOptions) {
     try {
      cookieStore.set({ name, value, ...options })
     } catch {
      // The `set` method was called from a Server Component.
     }
    },
    remove(name: string, options: CookieOptions) {
     try {
      cookieStore.set({ name, value: '', ...options })
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
  const isPlaceholder = !serviceKey || serviceKey === 'your_supabase_service_role_key' || serviceKey.startsWith('your_');
  const activeKey = isPlaceholder ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! : serviceKey;

  return _createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    activeKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

export const createClient = createServerClient;
