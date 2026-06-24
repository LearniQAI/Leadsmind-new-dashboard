const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Error listing users:", listError);
    return;
  }
  const testUser = users.users.find(u => u.email === 'test@test.com');
  if (!testUser) {
    console.log("test@test.com not found");
    return;
  }
  const { data, error } = await supabase.auth.admin.updateUserById(
    testUser.id,
    { password: 'Password123!' }
  );
  if (error) {
    console.error("Error resetting password:", error);
  } else {
    console.log("Successfully reset password for test@test.com to Password123!");
  }
}
run();
