(global as any).WebSocket = class {};

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  console.log("Checking columns on public.profiles...");
  const { data: pData, error: pErr } = await supabase.from('profiles').select('*').limit(1);
  if (pErr) console.log("profiles error:", pErr.message);
  else console.log("profiles columns:", Object.keys(pData[0] || {}));

  console.log("Checking columns on public.users...");
  const { data: uData, error: uErr } = await supabase.from('users').select('*').limit(1);
  if (uErr) console.log("users error:", uErr.message);
  else console.log("users columns:", Object.keys(uData[0] || {}));
}

check().catch(console.error);
