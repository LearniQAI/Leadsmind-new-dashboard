import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();

async function checkTable(tableName: string) {
  const url = `${supabaseUrl}/rest/v1/${tableName}?limit=1`;
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`Error querying ${tableName}:`, res.status, errText);
    } else {
      const data = await res.json();
      console.log(`${tableName} columns/sample:`, data);
    }
  } catch (err: any) {
    console.error(`Fetch failed for ${tableName}:`, err.message);
  }
}

async function run() {
  await checkTable('content_studio_documents');
  await checkTable('content_grammar_checks');
  await checkTable('content_plagiarism_checks');
  await checkTable('content_seo_checks');
}

run();
