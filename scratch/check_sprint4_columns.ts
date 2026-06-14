(global as any).WebSocket = class {};

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  console.log("Checking columns on contacts...");
  const { data: contacts, error: contactErr } = await supabase
    .from('contacts')
    .select('portal_access_enabled, portal_access_revoked, portal_password_hash')
    .limit(1);

  if (contactErr) {
    console.log("Contacts Error:", contactErr.message);
  } else {
    console.log("Contacts portal columns exist!");
  }

  console.log("Checking columns on booking_calendars...");
  const { data: bc, error: bcErr } = await supabase
    .from('booking_calendars')
    .select('cancellation_window_hours')
    .limit(1);

  if (bcErr) {
    console.log("booking_calendars Error:", bcErr.message);
  } else {
    console.log("booking_calendars cancellation_window_hours exists!");
  }
}

check().catch(console.error);
