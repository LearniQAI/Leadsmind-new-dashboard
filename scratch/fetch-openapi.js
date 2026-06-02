require('dotenv').config({ path: 'c:\\Users\\Administrator\\.gemini\\antigravity\\scratch\\Leadsmind-new-dashboard\\.env.local' });

async function run() {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;
  const headers = {
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
  };
  
  try {
    const res = await fetch(url, { headers });
    const data = await res.json();
    console.log('Paths available in REST API:');
    const paths = Object.keys(data.paths || {});
    console.log(paths.filter(p => p.startsWith('/rpc/')));
  } catch (e) {
    console.error('Error fetching OpenAPI spec:', e);
  }
}

run();
