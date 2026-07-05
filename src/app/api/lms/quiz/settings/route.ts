import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get('lessonId');

    if (!lessonId) {
      return NextResponse.json({ error: 'Missing lessonId parameter' }, { status: 400 });
    }

    const { data: settings, error } = await supabaseAdmin
      .from('quiz_settings')
      .select('*')
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ data: settings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      lesson_id,
      time_limit_minutes = null,
      max_attempts = 3,
      pass_percentage = 70,
      show_answers_after = 'submission',
      randomize_questions = false,
      publish_status = 'draft',
      scheduled_at = null
    } = body;

    if (!lesson_id) {
      return NextResponse.json({ error: 'Missing required field: lesson_id' }, { status: 400 });
    }

    const payload = {
      lesson_id,
      time_limit_minutes,
      max_attempts,
      pass_percentage,
      show_answers_after,
      randomize_questions,
      publish_status,
      scheduled_at
    };

    const { data: settings, error } = await supabaseAdmin
      .from('quiz_settings')
      .upsert(payload, { onConflict: 'lesson_id' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data: settings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  // Use POST logic for PATCH since it's an upsert on lesson_id anyway
  return POST(req);
}
