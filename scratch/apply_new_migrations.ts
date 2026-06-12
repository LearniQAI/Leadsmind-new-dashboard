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
    '20260611000002_student_lifecycle_and_automations.sql',
    '20260611000003_heartbeat_and_struggle_analytics.sql',
    '20260611000004_remedial_and_experts.sql',
    '20260611000005_cohort_and_rsvps.sql'
  ];

  for (const filename of migrations) {
    console.log(`Reading migration file: ${filename}...`);
    const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', filename);
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

  // Verify columns in public.enrollments
  const verifyEnrollmentsSql = `
    SELECT column_name::text AS first_name 
    FROM information_schema.columns 
    WHERE table_name = 'enrollments' 
    ORDER BY column_name;
  `;

  const { data: cols, error: colErr } = await supabase.rpc('fn_execute_segment_sql', {
    p_sql: verifyEnrollmentsSql,
    p_params: []
  });

  if (colErr) {
    console.error("Verification query failed:", colErr.message);
  } else {
    const colNames = cols.map((c: any) => c.first_name);
    console.log("Columns in enrollments table:", colNames);
  }
}

run().catch(console.error);
