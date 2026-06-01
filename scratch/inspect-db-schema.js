const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:\\Users\\Administrator\\.gemini\\antigravity\\scratch\\Leadsmind-new-dashboard\\.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const tables = ['conversations', 'messages', 'conversation_tags', 'conversation_notes', 'quick_replies', 'workspace_templates', 'contacts'];
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`Table "${table}": Error / Not Found (${error.message})`);
      } else {
        console.log(`Table "${table}": Found. Columns:`, Object.keys(data[0] || {}));
      }
    } catch (e) {
      console.log(`Table "${table}": Query failed:`, e.message);
    }
  }
}

run();
