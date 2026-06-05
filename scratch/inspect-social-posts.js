const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:\\Users\\Administrator\\.gemini\\antigravity\\scratch\\Leadsmind-new-dashboard\\.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  try {
    const { data, error } = await supabase.rpc('fn_execute_segment_sql', {
      p_sql: `SELECT column_name::text AS first_name FROM information_schema.columns WHERE table_name = 'social_posts' ORDER BY column_name`,
      p_params: []
    });
    
    if (error) {
      console.log('fn_execute_segment_sql RPC failed:', error.message);
    } else {
      console.log('Result:', data.map(r => r.first_name));
    }
  } catch (e) {
    console.error('Inspect failed:', e);
  }
}

run();
