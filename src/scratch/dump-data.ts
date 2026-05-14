import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    env.split('\n').forEach(line => {
      const [key, ...value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.join('=').trim().replace(/^["'](.*)["']$/, '$1');
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkMembers() {
  const { data: members, error } = await supabase
    .from('workspace_members')
    .select('*, user:users(*)');

  if (error) {
    console.error('Error fetching members:', error);
    return;
  }

  console.log('Total members in DB:', members.length);
  members.forEach(m => {
    console.log(`- Member ID: ${m.id}, User Email: ${m.user?.email || 'N/A'}, Workspace ID: ${m.workspace_id}`);
  });

  const { data: workspaces } = await supabase.from('workspaces').select('*');
  console.log('\nWorkspaces:');
  workspaces?.forEach(w => {
    console.log(`- WS ID: ${w.id}, Name: ${w.name}`);
  });
}

checkMembers();
