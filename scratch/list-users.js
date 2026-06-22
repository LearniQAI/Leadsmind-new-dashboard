const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log("Confirming admin@leadsmind.com...");
  const { data: d1, error: e1 } = await supabase.auth.admin.updateUserById(
    'b88db0bb-be1a-4484-9e21-7b5ef9891f52',
    { password: 'Password123!', email_confirm: true }
  );
  if (e1) console.error("Error admin:", e1);
  else console.log("Success admin:", d1.user.email, "Confirmed:", d1.user.email_confirmed_at);

  console.log("Confirming test@test.com...");
  const { data: d2, error: e2 } = await supabase.auth.admin.updateUserById(
    'be24b3f9-f4fa-4aff-a925-e9890d34ad30',
    { password: 'Password123!', email_confirm: true }
  );
  if (e2) console.error("Error test:", e2);
  else console.log("Success test:", d2.user.email, "Confirmed:", d2.user.email_confirmed_at);
}

run().catch(console.error);
