import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const formId = '3bf69313-f095-4ef8-99e7-79568f6a3b2c';

async function seed() {
  const { data: latest } = await supabase
    .from('form_versions')
    .select('version_number')
    .eq('form_id', formId)
    .order('version_number', { ascending: false })
    .limit(1);

  if (!latest || latest.length === 0) {
    const { error } = await supabase
      .from('form_versions')
      .insert({
        form_id: formId,
        version_number: 1,
        snapshot: { fields: [], config: {} },
        notes: 'Initial mock version for testing',
        created_by: 'oderinwalematthew3@gmail.com'
      });
      
    if (error) console.error(error);
    else console.log('Seeded initial version!');
  } else {
    console.log('Version already exists!');
  }
}

seed();
