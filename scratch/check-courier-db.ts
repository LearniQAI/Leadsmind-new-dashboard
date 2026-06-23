(global as any).WebSocket = class {};

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  console.log("Checking columns on courier_shipments...");
  const { data: shipments, error: err1 } = await supabase.from('courier_shipments').select('received_confirmed_at').limit(1);
  if (err1) {
    console.log("courier_shipments.received_confirmed_at check -> ERROR:", err1.message);
  } else {
    console.log("courier_shipments.received_confirmed_at exists!");
  }

  console.log("Checking tracking_quota table...");
  const { data: quota, error: err2 } = await supabase.from('tracking_quota').select('*').limit(1);
  if (err2) {
    console.log("tracking_quota check -> ERROR:", err2.message);
  } else {
    console.log("tracking_quota table exists!");
  }
}

check().catch(console.error);
