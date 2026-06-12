global.WebSocket = class {};
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function run() {
  console.log("Checking courses table...");
  const { data, error } = await supabase.from('courses').select('*').limit(1);
  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("Course keys:", data.length > 0 ? Object.keys(data[0]) : "No courses found");
  }
}

run();
