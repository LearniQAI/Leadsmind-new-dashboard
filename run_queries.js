const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
  console.log("Connecting to Supabase...");
  
  // 1. Get list of tables in public schema
  console.log("\n--- Tables in public schema ---");
  const { data: tables, error: tablesError } = await supabase.rpc('get_tables');
  
  if (tablesError) {
    // Let's query tables via selecting from pg_catalog or executing sql.
    // Since we don't have a direct sql rpc yet, let's try querying standard tables to see which ones work.
    const testTables = ['contacts', 'deals', 'opportunities', 'invoices', 'tasks', 'todos', 'projects', 'conversations', 'messages'];
    for (const table of testTables) {
      const { error } = await supabase.from(table).select('id').limit(1);
      if (error) {
        console.log(`Table '${table}' -> ERROR: ${error.message} (code: ${error.code})`);
      } else {
        console.log(`Table '${table}' -> EXISTS`);
      }
    }
  } else {
    console.log(tables);
  }
}

run().catch(console.error);
