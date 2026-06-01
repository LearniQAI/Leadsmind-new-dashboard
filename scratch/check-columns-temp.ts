(global as any).WebSocket = class {};

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching module:', error);
  } else {
    console.log('Module columns:', data.length > 0 ? Object.keys(data[0]) : 'No data in modules');
  }

  const { data: quizData, error: quizError } = await supabase
    .from('lms_quizzes')
    .select('*')
    .limit(1);

  if (quizError) {
    console.error('Error fetching quiz:', quizError);
  } else {
    console.log('Quiz columns:', quizData.length > 0 ? Object.keys(quizData[0]) : 'No data in lms_quizzes');
  }
}

check();
