import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEnum() {
  const { data, error } = await supabase.rpc('check_enum_values', { enum_name: 'task_status' });
  
  if (error) {
    // If RPC doesn't exist, try direct query via postgrest if possible, 
    // but usually we need an RPC for system tables.
    // Let's try to just fetch one task and see its type if possible, or use a raw query if we have an endpoint.
    console.error('Error fetching enum:', error);
    
    // Alternative: Try to just update a task to 'in_review' and see if it fails here too
    console.log('Testing update to in_review...');
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ status: 'in_review' })
      .limit(1);
    
    if (updateError) {
      console.log('Update failed as expected:', updateError.message);
    } else {
      console.log('Update succeeded! The issue might be client-side or specific to the data being sent.');
    }
  } else {
    console.log('Enum values:', data);
  }
}

checkEnum();
