import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function clearMockData() {
  console.log('Clearing mock data...');
  
  // Clear versions
  const res1 = await supabase.from('form_versions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleared form_versions:', res1.error ? res1.error : 'Success');
  
  // Clear audit logs
  const res2 = await supabase.from('form_audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleared form_audit_logs:', res2.error ? res2.error : 'Success');
  
  // Clear diagnostics logs
  const res3 = await supabase.from('form_diagnostics_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleared form_diagnostics_logs:', res3.error ? res3.error : 'Success');
  
  console.log('Done.');
}

clearMockData();
