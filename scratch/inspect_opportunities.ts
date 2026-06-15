import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

(global as any).WebSocket = class {};

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  console.log("Fetching columns of opportunities...");
  const { data: opportunities, error } = await supabase.from('opportunities').select('*').limit(1);
  if (error) {
    console.error("Error fetching opportunities:", error.message);
  } else if (opportunities && opportunities.length > 0) {
    console.log("Opportunities columns:", Object.keys(opportunities[0]));
    console.log("Sample opportunity:", opportunities[0]);
  } else {
    console.log("No opportunities found, fetching schema via information_schema if available...");
    // Let's run a select on pg_attribute or try a dummy insert to get columns
    const { data: cols, error: colError } = await supabase.from('opportunities').insert({}).select();
    if (colError) {
      console.log("Col error message (contains columns/errors):", colError.message);
    }
  }

  console.log("\nFetching pipeline stages...");
  const { data: stages, error: stagesError } = await supabase.from('pipeline_stages').select('*').limit(20);
  if (stagesError) {
    console.error("Error fetching stages:", stagesError.message);
  } else {
    console.log("Stages:", stages?.map(s => ({ id: s.id, name: s.name, pipeline_id: s.pipeline_id })));
  }
}

run().catch(console.error);
