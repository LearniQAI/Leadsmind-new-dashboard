import { createAdminClient } from '../lib/supabase/server';
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

async function diagnose() {
  // Load environment manually if needed, but since we are running in the workspace
  // we might need to provide the URL/Key if they aren't in process.env
  
  const admin = createAdminClient();
  
  console.log('--- WORKSPACES ---');
  const { data: workspaces } = await admin.from('workspaces').select('*');
  console.log(workspaces);

  console.log('\n--- ALL MEMBERS ---');
  const { data: members } = await admin.from('workspace_members').select('*, user:users(*)');
  console.log(members);

  console.log('\n--- ALL INVITATIONS ---');
  const { data: invites } = await admin.from('workspace_invitations').select('*');
  console.log(invites);
}

diagnose();
