import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();

async function run() {
  // Query pg_constraint for check constraints on support_tickets table
  const query = `
    SELECT 
      conname, 
      pg_get_constraintdef(oid) as condef 
    FROM pg_constraint 
    WHERE conrelid = 'public.support_tickets'::regclass;
  `;
  const url = `${supabaseUrl}/rest/v1/rpc/check_constraints`; // We might not have this RPC, so let's try direct table queries first
  
  // Let's query support_tickets table to see a sample record and its priority value
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
  } catch (err: any) {
    console.error('Fetch failed:', err.message);
  }
}

run();
