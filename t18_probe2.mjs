import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const email = `t18-signup-test-${Date.now()}@example.com`;
const password = 'T18-refund-test-pw-!23456';
const { data, error } = await anon.auth.signUp({ email, password });
console.log('signUp error:', error);
console.log('signUp data user:', data?.user ? { id: data.user.id, email: data.user.email, confirmed: data.user.confirmed_at } : null);
console.log('session:', data?.session ? 'present' : 'absent (likely needs email confirmation)');
