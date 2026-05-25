import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // use service role to bypass RLS

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function test() {
  const workspaceId = '00000000-0000-0000-0000-000000000000'; // Need a valid workspace ID!
  // fetch a valid workspace
  const { data: ws } = await supabase.from('workspaces').select('id').limit(1).single();
  
  if (!ws) {
    console.log('No workspace found');
    return;
  }

  const contactPayload = {
    workspace_id: ws.id,
    first_name: 'Test Business',
    last_name: '',
    email: '',
    phone: '123456789',
    source: 'Lead Finder',
    tags: ['Lead Finder'],
  };

  const { data, error } = await supabase.from('contacts').insert(contactPayload).select();
  console.log('Insert Result:', { data, error });
}

test();
