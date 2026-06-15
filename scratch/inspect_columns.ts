import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

(global as any).WebSocket = class {};

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  console.log("Fetching one contact to inspect keys...");
  const { data: contacts, error: err1 } = await supabase.from('contacts').select('*').limit(1);
  if (err1) {
    console.error("Error fetching contact:", err1.message);
  } else if (contacts && contacts.length > 0) {
    console.log("Contact columns:", Object.keys(contacts[0]));
  } else {
    console.log("No contacts found to inspect.");
  }

  console.log("\nChecking if kyc_checks table exists...");
  const { data: checks, error: err2 } = await supabase.from('kyc_checks').select('*').limit(1);
  if (err2) {
    console.error("Error fetching kyc_checks:", err2.message);
  } else if (checks && checks.length > 0) {
    console.log("kyc_checks columns:", Object.keys(checks[0]));
  } else {
    console.log("kyc_checks table exists but has no records or columns are empty.");
  }
}

run().catch(console.error);
