(global as any).WebSocket = class {};

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const { data, error } = await supabase.from('kyc_consent').select('id').limit(1);
  if (error) {
    console.error("kyc_consent table does not exist or error:", error.message, error.code);
  } else {
    console.log("kyc_consent table EXISTS! Data:", data);
  }
}

run().catch(console.error);
