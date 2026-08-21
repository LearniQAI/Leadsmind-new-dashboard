require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const EMAIL = 'zainulhassan5857@gmail.com';
const PASSWORD = process.env.NEW_USER_PASSWORD || 'TempStudentPass!2026';

async function main() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) {
    console.error('createUser error:', error.message);
    process.exit(1);
  }
  console.log('Created auth user:', data.user.id, data.user.email);
}
main();
