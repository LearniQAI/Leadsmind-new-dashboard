import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Mock WebSocket to prevent Realtime client crash in node environments
if (typeof global !== 'undefined' && !(global as any).WebSocket) {
  (global as any).WebSocket = class {};
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  console.log("Checking kyc_risk_ratings table...");
  const { data: ratingData, error: ratingError } = await supabase
    .from('kyc_risk_ratings')
    .select('*')
    .limit(1);

  if (ratingError) {
    console.log("kyc_risk_ratings table DOES NOT exist or error occurred:", ratingError.message);
  } else {
    console.log("kyc_risk_ratings table EXISTS!");
  }

  console.log("\nChecking opportunities columns...");
  const { data: oppData, error: oppError } = await supabase
    .from('opportunities')
    .select('manager_override')
    .limit(1);

  if (oppError) {
    console.log("manager_override column DOES NOT exist or error occurred:", oppError.message);
  } else {
    console.log("manager_override column EXISTS!");
  }
}

check().catch(console.error);
