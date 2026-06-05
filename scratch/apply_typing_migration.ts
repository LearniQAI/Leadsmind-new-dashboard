(global as any).WebSocket = class {};

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  console.log("Applying database migration via RPC...");
  
  // Alter table to add column and then return empty contacts structure to satisfy RPC type
  const sql = `
    ALTER TABLE public.lena_conversations ADD COLUMN IF NOT EXISTS agent_typing_until timestamptz;
    SELECT * FROM public.contacts LIMIT 0;
  `;
  
  const { data, error } = await supabase.rpc('fn_execute_segment_sql', {
    p_sql: sql,
    p_params: []
  });
  
  if (error) {
    console.error("Migration failed:", error.message);
    process.exit(1);
  } else {
    console.log("Migration applied successfully!");
    
    // Let's verify by inspecting column
    const verifySql = `
      SELECT column_name::text AS first_name 
      FROM information_schema.columns 
      WHERE table_name = 'lena_conversations' 
      ORDER BY column_name;
    `;
    
    const { data: cols, error: colErr } = await supabase.rpc('fn_execute_segment_sql', {
      p_sql: verifySql,
      p_params: []
    });
    
    if (colErr) {
      console.error("Verification query failed:", colErr.message);
    } else {
      const colNames = cols.map((c: any) => c.first_name);
      console.log("Columns in lena_conversations:", colNames);
      if (colNames.includes('agent_typing_until')) {
        console.log("SUCCESS: 'agent_typing_until' is present!");
      } else {
        console.error("FAIL: 'agent_typing_until' column not found!");
      }
    }
  }
}

run().catch(console.error);
