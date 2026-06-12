(global as any).WebSocket = class {};

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const rpcNames = ['exec_sql', 'run_sql', 'execute_sql', 'sql', 'query'];
const paramNames = ['sql', 'query', 'sql_query', 'p_sql', 'p_query', 'query_string'];

async function test() {
  for (const rpcName of rpcNames) {
    for (const paramName of paramNames) {
      console.log(`Testing RPC: ${rpcName} with param: ${paramName}...`);
      const { data, error } = await supabase.rpc(rpcName, { 
        [paramName]: 'SELECT 1 as val'
      });
      
      if (error) {
        // If it says "Could not find...", it means signature mismatch or missing function
        if (!error.message.includes('Could not find')) {
          console.log(`  FOUND! But failed with: ${error.message} (code: ${error.code})`);
        }
      } else {
        console.log(`  SUCCESS! RPC: ${rpcName}, Param: ${paramName}, Data:`, data);
        return;
      }
    }
  }
}

test().catch(console.error);
