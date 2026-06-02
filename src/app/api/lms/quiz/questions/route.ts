import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    const { data: questions, error } = await supabaseAdmin
      .from('quiz_questions')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('position', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ data: questions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      lesson_id,
      workspace_id,
      question_type,
      question_text,
      options = [],
      correct_answer,
      explanation = '',
      points = 1,
      position = 0
    } = body;

    if (!lesson_id || !workspace_id || !question_type || !question_text) {
      return NextResponse.json({ error: 'Missing required fields: lesson_id, workspace_id, question_type, question_text' }, { status: 400 });
    }

    const { data: question, error } = await supabaseAdmin
      .from('quiz_questions')
      .insert({
        lesson_id,
        workspace_id,
        question_type,
        question_text,
        options,
        correct_answer,
        explanation,
        points,
        position
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data: question });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing question id parameter' }, { status: 400 });
    }

    const body = await req.json();
    const {
      question_type,
      question_text,
      options,
      correct_answer,
      explanation,
      points,
      position
    } = body;

    const updatePayload: any = {};
    if (question_type !== undefined) updatePayload.question_type = question_type;
    if (question_text !== undefined) updatePayload.question_text = question_text;
    if (options !== undefined) updatePayload.options = options;
    if (correct_answer !== undefined) updatePayload.correct_answer = correct_answer;
    if (explanation !== undefined) updatePayload.explanation = explanation;
    if (points !== undefined) updatePayload.points = points;
    if (position !== undefined) updatePayload.position = position;

    const { data: question, error } = await supabaseAdmin
      .from('quiz_questions')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data: question });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing question id parameter' }, { status: 400 });
    }

    const idList = id.split(',');
    const { error } = await supabaseAdmin
      .from('quiz_questions')
      .delete()
      .in('id', idList);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
