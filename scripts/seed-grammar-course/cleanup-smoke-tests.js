require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, title')
    .ilike('title', 'Grammar Smoke Test%');
  if (error) { console.error(error); process.exit(1); }
  console.log(`Found ${courses.length} smoke-test courses to remove.`);

  for (const c of courses) {
    const { data: enrollments } = await supabase.from('enrollments').select('id').eq('course_id', c.id);
    // Clean up dependent rows first (no cascade delete configured for these tables)
    await supabase.from('course_content_chunks').delete().eq('course_id', c.id);
    await supabase.from('lesson_summaries').delete().eq('course_id', c.id);
    await supabase.from('enrollments').delete().eq('course_id', c.id);
    await supabase.from('course_lessons').delete().eq('course_id', c.id);
    await supabase.from('course_modules').delete().eq('course_id', c.id);
    const { error: delErr } = await supabase.from('courses').delete().eq('id', c.id);
    console.log(`  ${delErr ? 'FAILED' : 'deleted'}: ${c.title} (${c.id}), had ${enrollments?.length ?? 0} enrollments`);
  }
}
main();
