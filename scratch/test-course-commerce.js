// Test script: scratch/test-course-commerce.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Stub global WebSocket for older node runtimes
global.WebSocket = class {};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSuite() {
  console.log("==================================================");
  console.log("    LEADSMIND COURSE COMMERCE MODULE TEST SUITE   ");
  console.log("==================================================\n");

  // Test 1: Direct Connect Gateway configs presence check
  const { data: integrations, error: intErr } = await supabase
    .from('workspace_integrations')
    .select('*')
    .eq('provider', 'stripe');
  
  if (intErr) console.error("Integrations error:", intErr);
  else console.log("Integrations success!");

  // Test 2: Verify custom columns on courses table
  const { data: courses, error: courseErr } = await supabase
    .from('courses')
    .select('pricing_model, subscription_interval, enrolment_cap')
    .limit(1);

  if (courseErr) console.error("Courses error:", courseErr);
  else console.log("Courses success!");

  // Test 3: Verify custom columns on course_lessons table
  const { data: lessons, error: lessonErr } = await supabase
    .from('course_lessons')
    .select('access_level')
    .limit(1);

  if (lessonErr) console.error("Lessons error:", lessonErr);
  else console.log("Lessons success!");

  // Test 4: Verify custom columns on enrollments table
  const { data: enrolls, error: enrollErr } = await supabase
    .from('enrollments')
    .select('access_type, payment_status, subscription_interval, subscription_ends_at, active')
    .limit(1);

  if (enrollErr) console.error("Enrollments error:", enrollErr);
  else console.log("Enrollments success!");

  // Test 5: Verify custom columns on course_progress table
  const { data: prog, error: progErr } = await supabase
    .from('course_progress')
    .select('progress_seconds, interaction_attempts')
    .limit(1);

  if (progErr) console.error("Progress error:", progErr);
  else console.log("Progress success!");
}

testSuite().catch(console.error);
