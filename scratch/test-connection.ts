(global as any).WebSocket = class {};

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  console.log("Testing connection to:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const { data, error } = await supabase.from('contacts').select('id, first_name, last_name').limit(1);
  if (error) {
    console.error("Query failed:", error.message, error.code);
  } else {
    console.log("Query succeeded! Data:", data);
  }
}

run().catch(console.error);
