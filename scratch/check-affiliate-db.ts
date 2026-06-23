(global as any).WebSocket = class {};

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  console.log("Checking referred_by_affiliate_id on contacts...");
  const { data, error } = await supabase.from('contacts').select('referred_by_affiliate_id').limit(1);
  if (error) {
    console.log("contacts.referred_by_affiliate_id check -> ERROR:", error.message);
  } else {
    console.log("contacts.referred_by_affiliate_id exists!");
  }

  console.log("Checking listed_in_marketplace on affiliate_programmes...");
  const { data: prog, error: err2 } = await supabase.from('affiliate_programmes').select('listed_in_marketplace').limit(1);
  if (err2) {
    console.log("affiliate_programmes.listed_in_marketplace check -> ERROR:", err2.message);
  } else {
    console.log("affiliate_programmes.listed_in_marketplace exists!");
  }

  console.log("Checking affiliate_email_queue table...");
  const { data: queue, error: err3 } = await supabase.from('affiliate_email_queue').select('*').limit(1);
  if (err3) {
    console.log("affiliate_email_queue check -> ERROR:", err3.message);
  } else {
    console.log("affiliate_email_queue exists!");
  }
}

check().catch(console.error);
