// Mock WebSocket to bypass realtime-js instantiation crash in Node < 22
(global as any).WebSocket = class {};

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function test() {
  const quizId = '07d64705-f363-4aed-8d43-487574633137';

  const { data: questions, error } = await supabase
    .from('lms_questions')
    .select('*')
    .eq('quiz_id', quizId);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Full questions records:");
    console.log(JSON.stringify(questions, null, 2));
  }
}

test();
