const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const email = 'admin@leadsmind.com';
  console.log('Checking user ID for:', email);
  
  const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.error('Auth error:', authErr);
    return;
  }
  
  const user = users.find(u => u.email === email);
  if (!user) {
    console.log('User not found!');
    return;
  }
  console.log('User found:', user.id);
  
  const { data: members, error: memErr } = await supabase
    .from('workspace_members')
    .select('*, workspaces(*)')
    .eq('user_id', user.id);
    
  if (memErr) {
    console.error('Error fetching members:', memErr);
    return;
  }
  
  console.log('Workspace memberships found:', JSON.stringify(members, null, 2));
}

check();
