const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

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

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use the active workspace ID we saw (4b6a9a9c-1634-4b91-95a4-0b51ef4ea780)
const workspaceId = '4b6a9a9c-1634-4b91-95a4-0b51ef4ea780';

async function main() {
  // Let's call the Rest API directly to mimic:
  // supabase.from('courses').select('*, modules:course_modules(count)').eq('workspace_id', workspaceId)
  const url = `${supabaseUrl}/rest/v1/courses?select=*,modules:course_modules(count)&workspace_id=eq.${workspaceId}&order=created_at.desc`;
  console.log("Fetching from:", url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    console.log("Status:", res.status, res.statusText);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Query failed:", err);
  }
}

main();
