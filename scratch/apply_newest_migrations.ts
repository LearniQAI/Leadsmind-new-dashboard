(global as any).WebSocket = class {};

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const migrations = [
    '20260613000000_customer_portal_rls.sql',
    '20260613000001_sprint3_lms_projects.sql',
    '20260613000002_sprint4_documents_meetings.sql'
  ];

  for (const filename of migrations) {
    console.log(`Reading migration file: ${filename}...`);
    const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', filename);
    if (!fs.existsSync(sqlPath)) {
      console.log(`Skipping ${filename} (does not exist)`);
      continue;
    }
    let sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Append contacts select to satisfy fn_execute_segment_sql's return type (SETOF public.contacts)
    const fullSql = `
      ${sqlContent}
      SELECT * FROM public.contacts LIMIT 0;
    `;

    console.log(`Applying database migration ${filename} via fn_execute_segment_sql RPC...`);
    const { data, error } = await supabase.rpc('fn_execute_segment_sql', {
      p_sql: fullSql,
      p_params: []
    });

    if (error) {
      console.error(`Migration ${filename} failed:`, error.message);
      process.exit(1);
    }

    console.log(`Migration ${filename} applied successfully!`);
  }
  console.log("Migrations check/run completed!");
}

run().catch(console.error);
