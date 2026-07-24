import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const { data, error } = await supabase.auth.admin.listUsers({ perPage: 3 });
console.log('listUsers error:', error);
console.log('listUsers data:', data?.users?.map(u => ({id: u.id, email: u.email})));
