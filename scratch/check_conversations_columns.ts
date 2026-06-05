(global as any).WebSocket = class {};
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const { data, error } = await supabase.from('lena_conversations').select('*').limit(1);
  if (error) {
    console.error("Failed to query lena_conversations:", error.message);
  } else {
    console.log("Query succeeded!");
    if (data && data.length > 0) {
      console.log("Columns:", Object.keys(data[0]));
    } else {
      // If no rows, check via PostgREST OpenAPI schema
      console.log("No rows found. Querying OpenAPI schema...");
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`
        }
      });
      const json = await res.json();
      const properties = json.definitions?.lena_conversations?.properties || {};
      console.log("Columns from OpenAPI schema:", Object.keys(properties));
    }
  }
}

run().catch(console.error);
