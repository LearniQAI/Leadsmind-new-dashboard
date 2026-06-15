(global as any).WebSocket = class {};

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  console.log("Checking columns on kyc_checks...");
  const { data, error } = await supabase
    .from('kyc_checks')
    .select('score, risk_band, defaults_count, judgements_count, total_debt_exposure, monthly_repayments')
    .limit(1);

  if (error) {
    console.log("Error querying columns:", error.message);
  } else {
    console.log("SUCCESS! All columns exist in kyc_checks:", Object.keys(data[0] || {}));
  }
}

check().catch(console.error);
