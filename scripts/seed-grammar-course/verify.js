require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const COURSE_ID = 'e913a270-0266-46b3-a38d-5a1c1ec867b9';

async function main() {
  const { data: lessons } = await supabase
    .from('course_lessons')
    .select('id, title, module_id')
    .eq('course_id', COURSE_ID)
    .order('position');
  console.log(`Lessons: ${lessons.length}`);

  const { data: chunks } = await supabase
    .from('course_content_chunks')
    .select('lesson_id, chunk_index, content_text, model_used, embedding')
    .eq('course_id', COURSE_ID);

  const { data: summaries } = await supabase
    .from('lesson_summaries')
    .select('lesson_id, summary_bullets, model_used')
    .eq('course_id', COURSE_ID);

  console.log('\n=== Per-lesson verification ===');
  for (const lesson of lessons) {
    const lessonChunks = chunks.filter(c => c.lesson_id === lesson.id);
    const summary = summaries.find(s => s.lesson_id === lesson.id);
    const embeddingOk = lessonChunks.length > 0 && lessonChunks.every(c => Array.isArray(c.embedding) || typeof c.embedding === 'string');
    console.log(`- ${lesson.title}`);
    console.log(`    chunks: ${lessonChunks.length} (model: ${lessonChunks[0]?.model_used ?? 'N/A'}), embeddings present: ${embeddingOk}`);
    console.log(`    summary: ${summary ? 'YES (' + summary.summary_bullets.length + ' bullets, model: ' + summary.model_used + ')' : 'MISSING'}`);
  }

  console.log(`\nTotals: ${chunks.length} chunks across ${lessons.length} lessons, ${summaries.length} summaries`);

  const { data: enrollments } = await supabase.from('enrollments').select('*').eq('course_id', COURSE_ID);
  console.log(`\nEnrollments: ${enrollments.length}`, JSON.stringify(enrollments, null, 2));
}
main();
