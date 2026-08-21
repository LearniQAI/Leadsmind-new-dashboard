require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const COURSE_ID = 'e913a270-0266-46b3-a38d-5a1c1ec867b9';

async function main() {
  const { data, error } = await supabase
    .from('course_qa_interactions')
    .select('question, answer, grounded, source_chunks_used, model_used, created_at')
    .eq('course_id', COURSE_ID)
    .order('created_at', { ascending: true });
  if (error) { console.error(error); process.exit(1); }
  console.log(`Found ${data.length} Q&A interactions for this course.\n`);
  for (const row of data) {
    console.log('Q:', row.question);
    console.log('A:', row.answer);
    console.log('grounded:', row.grounded, '| model:', row.model_used, '| sources used:', row.source_chunks_used.length);
    console.log('---');
  }
}
main();
