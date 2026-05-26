import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();

async function run() {
  const url = `${supabaseUrl}/rest/v1/`;
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    if (!res.ok) {
      console.error(res.status, await res.text());
    } else {
      const data = await res.json();
      const tables = Object.keys(data.paths)
        .filter(p => p !== '/' && !p.includes('{'))
        .map(p => p.slice(1));
      console.log("Tables in DB:", tables);
    }
  } catch (err: any) {
    console.error(err);
  }
}
run();
