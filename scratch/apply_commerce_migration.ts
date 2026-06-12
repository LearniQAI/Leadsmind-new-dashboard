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
  console.log("Reading migration file...");
  const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20260611000001_course_commerce_and_access.sql');
  let sqlContent = fs.readFileSync(sqlPath, 'utf8');

  // Append empty contacts select to satisfy fn_execute_segment_sql's return type (SETOF public.contacts)
  const fullSql = `
    ${sqlContent}
    SELECT * FROM public.contacts LIMIT 0;
  `;

  console.log("Applying database migration via fn_execute_segment_sql RPC...");
  const { data, error } = await supabase.rpc('fn_execute_segment_sql', {
    p_sql: fullSql,
    p_params: []
  });

  if (error) {
    console.error("Migration failed:", error.message);
    process.exit(1);
  }

  console.log("Migration applied successfully!");

  // Verify the columns in public.courses
  const verifyCoursesSql = `
    SELECT column_name::text AS first_name 
    FROM information_schema.columns 
    WHERE table_name = 'courses' 
    ORDER BY column_name;
  `;

  const { data: courseCols, error: courseColErr } = await supabase.rpc('fn_execute_segment_sql', {
    p_sql: verifyCoursesSql,
    p_params: []
  });

  if (courseColErr) {
    console.error("Verification query failed:", courseColErr.message);
  } else {
    const colNames = courseCols.map((c: any) => c.first_name);
    console.log("Columns in courses table:", colNames);
  }
}

run().catch(console.error);
