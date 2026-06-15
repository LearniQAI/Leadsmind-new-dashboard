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
  const filename = '20260625000000_sprint11_real_estate_pipeline.sql';
  console.log(`Reading migration file: ${filename}...`);
  const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', filename);
  if (!fs.existsSync(sqlPath)) {
    console.error(`File ${filename} does not exist at ${sqlPath}`);
    process.exit(1);
  }
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

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
    console.error(`Migration failed:`, error.message);
    process.exit(1);
  }

  console.log(`Migration applied successfully!`);
}

run().catch(console.error);
