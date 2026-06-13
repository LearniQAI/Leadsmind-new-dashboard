// Mock WebSocket to prevent Realtime client crash in node environments
if (typeof global !== 'undefined' && !(global as any).WebSocket) {
  (global as any).WebSocket = class {};
}

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function inspect() {
  console.log("Checking calendars table...");
  const { data: calData, error: calError } = await supabase
    .from('calendars')
    .select('*')
    .limit(1);

  if (calError) {
    console.error("Error fetching calendars:", calError);
  } else {
    console.log("calendars records:", calData);
  }

  console.log("Checking booking_calendars table...");
  const { data: bcData, error: bcError } = await supabase
    .from('booking_calendars')
    .select('*')
    .limit(1);

  if (bcError) {
    console.error("Error fetching booking_calendars:", bcError);
  } else {
    console.log("booking_calendars records:", bcData);
  }
}

inspect().catch(console.error);
