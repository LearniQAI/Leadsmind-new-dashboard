const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:\\Users\\Administrator\\.gemini\\antigravity\\scratch\\Leadsmind-new-dashboard\\.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  try {
    const { data: columns, error } = await supabase.rpc('inspect_table_columns', { table_name: 'messages' });
    if (error) {
      // Fallback: select a single row and print its keys
      console.log('RPC inspect failed:', error.message);
      const { data: row, error: rowError } = await supabase.from('messages').select('*').limit(1);
      if (rowError) {
        console.error('Row select failed:', rowError.message);
      } else {
        console.log('Columns of messages table:', Object.keys(row[0] || {}));
      }
    } else {
      console.log('Columns of messages table:', columns);
    }
  } catch (e) {
    console.error('Inspect failed:', e);
  }
}

run();
