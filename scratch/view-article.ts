(global as any).WebSocket = class {};
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data } = await supabase
    .from('help_articles')
    .select('*')
    .eq('slug', 'lead-assignment-round-robin-automation-paths')
    .single();
  console.log(JSON.stringify(data, null, 2));
}

main();
