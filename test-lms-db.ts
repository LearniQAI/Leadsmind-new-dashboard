// Mock WebSocket to bypass realtime-js instantiation crash in Node < 22
(global as any).WebSocket = class {};

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function test() {
  const { data: tables, error } = await supabase.rpc('get_tables');
  
  if (error) {
    // If get_tables RPC doesn't exist, query pg_catalog using a standard select
    console.log("RPC get_tables failed or doesn't exist. Querying via select...");
    
    // We can run a direct SQL query by querying a table or just testing if specific tables exist:
    const tablesToCheck = [
      'courses', 'modules', 'lessons', 'lms_quizzes', 'lms_questions', 
      'lms_quiz_submissions', 'quizzes', 'quiz_questions', 'quiz_options', 'quiz_explanations'
    ];
    
    for (const table of tablesToCheck) {
      const { error: queryErr } = await supabase.from(table).select('id').limit(1);
      if (queryErr) {
        console.log(`Table '${table}' query error code:`, queryErr.code, `(${queryErr.message})`);
      } else {
        console.log(`Table '${table}' EXISTS!`);
      }
    }
  } else {
    console.log("Public tables:", tables);
  }
}

test();
