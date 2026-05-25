import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const dbPayload = {
    form_id: '123e4567-e89b-12d3-a456-426614174000', // Need a valid UUID or it might fail FK
    session_id: 'test-session',
    field_values: { test: 123 },
    current_step_id: 'step-1',
    completion_percentage: 10.5,
  };

  const { data, error } = await supabase
    .from('form_partial_submissions')
    .upsert(dbPayload, { onConflict: 'form_id,session_id' })
    .select()
    .single();

  console.log('Result:', { data, error });
}

test();
