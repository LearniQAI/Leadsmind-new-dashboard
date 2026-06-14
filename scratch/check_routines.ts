(global as any).WebSocket = class {};

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  console.log("Attempting to query information_schema.routines...");
  const { data, error } = await supabase
    .from('routines')
    .select('routine_name')
    .ilike('routine_name', '%sql%')
    .limit(10);

  if (error) {
    console.log("Failed to query routines table:", error.message);
  } else {
    console.log("Routines:", data);
  }

  console.log("Attempting to query pg_catalog.pg_proc...");
  const { data: procData, error: procError } = await supabase
    .from('pg_proc')
    .select('proname')
    .limit(10);

  if (procError) {
    console.log("Failed to query pg_proc table:", procError.message);
  } else {
    console.log("pg_proc:", procData);
  }
}

run().catch(console.error);
