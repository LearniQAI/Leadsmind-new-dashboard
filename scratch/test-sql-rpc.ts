(global as any).WebSocket = class {};

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const rpcNames = ['exec_sql', 'run_sql', 'execute_sql', 'sql', 'query'];

async function test() {
  for (const name of rpcNames) {
    console.log(`Testing RPC: ${name}...`);
    const { data, error } = await supabase.rpc(name, { 
      sql: 'SELECT 1 as val',
      query: 'SELECT 1 as val',
      sql_query: 'SELECT 1 as val'
    });
    
    if (error) {
      console.log(`  Error: ${error.message} (code: ${error.code})`);
    } else {
      console.log(`  SUCCESS! Data:`, data);
      break;
    }
  }
}

test();
