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
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testQuery(tableName) {
  const url = `${supabaseUrl}/rest/v1/${tableName}?select=*&limit=1`;
  console.log(`\nTesting select from ${tableName}...`);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });
    console.log(`Status:`, res.status, res.statusText);
    const text = await res.text();
    console.log(`Response:`, text.substring(0, 200));
  } catch (err) {
    console.error(`Error:`, err);
  }
}

async function main() {
  await testQuery('users');
  await testQuery('courses');
}

main();
