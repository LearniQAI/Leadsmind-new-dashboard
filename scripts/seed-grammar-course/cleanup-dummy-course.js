// No course-delete UI/API route exists in this codebase (confirmed via code search).
// This course is empty (0 lessons, 0 enrollments) so there is no RAG/summary data to lose
// and no pipeline being bypassed by a direct delete.
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const DUMMY_COURSE_ID = '70676bc2-9da1-4d95-a706-a141ec0dd67e';

async function main() {
  const { data: lessons } = await supabase.from('course_lessons').select('id').eq('course_id', DUMMY_COURSE_ID);
  const { data: enrollments } = await supabase.from('enrollments').select('id').eq('course_id', DUMMY_COURSE_ID);
  if ((lessons && lessons.length > 0) || (enrollments && enrollments.length > 0)) {
    console.error('SAFETY ABORT: dummy course has lessons or enrollments, not deleting.', { lessons, enrollments });
    process.exit(1);
  }

  const { error: modErr } = await supabase.from('course_modules').delete().eq('course_id', DUMMY_COURSE_ID);
  if (modErr) { console.error('module delete error', modErr); process.exit(1); }

  const { error: courseErr } = await supabase.from('courses').delete().eq('id', DUMMY_COURSE_ID);
  if (courseErr) { console.error('course delete error', courseErr); process.exit(1); }

  console.log('Deleted dummy course "Masterclass in English" and its empty module.');
}
main();
