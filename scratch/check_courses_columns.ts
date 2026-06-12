import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

if (typeof global !== 'undefined' && !(global as any).WebSocket) {
  (global as any).WebSocket = class {};
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('courses').select('*').limit(1);
  if (error) {
    console.error("Error fetching courses:", error);
    return;
  }
  console.log("Course record:", data);
}

check();
