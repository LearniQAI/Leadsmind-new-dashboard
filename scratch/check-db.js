require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();

async function run() {
  const sampleUrl = `${supabaseUrl}/rest/v1/support_tickets?limit=5`;
  
  try {
    const res = await fetch(sampleUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    if (!res.ok) {
      console.error('Error querying support_tickets:', res.status, await res.text());
    } else {
      const data = await res.json();
      console.log('support_tickets sample data:', data);
    }
  } catch (err) {
    console.error('Fetch failed:', err.message);
  }
}

run();
