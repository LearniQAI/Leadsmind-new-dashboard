(global as any).WebSocket = class {};

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  console.log("Checking columns on projects...");
  const { data: proj, error: projErr } = await supabase.from('projects').select('start_date, project_settings, budget, cost, tracked_hours').limit(1);
  if (projErr) console.log("Projects Error:", projErr.message);
  else console.log("Projects columns exist!");

  console.log("Checking columns on project_tasks...");
  const { data: tasks, error: tasksErr } = await supabase.from('project_tasks').select('is_milestone, client_approved_at, approved_by_contact_id').limit(1);
  if (tasksErr) console.log("Project Tasks Error:", tasksErr.message);
  else console.log("Project Tasks columns exist!");

  console.log("Checking columns on enrollments...");
  const { data: enroll, error: enrollErr } = await supabase.from('enrollments').select('last_lesson_id, last_position_seconds').limit(1);
  if (enrollErr) console.log("Enrollments Error:", enrollErr.message);
  else console.log("Enrollments columns exist!");

  console.log("Checking columns on media_files...");
  const { data: media, error: mediaErr } = await supabase.from('media_files').select('project_id, is_client_deliverable').limit(1);
  if (mediaErr) console.log("Media Files Error:", mediaErr.message);
  else console.log("Media Files columns exist!");
}

check().catch(console.error);
