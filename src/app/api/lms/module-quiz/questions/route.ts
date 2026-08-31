import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { ForbiddenError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Module-Level Quiz — mirrors /api/lms/quiz/questions exactly, module_id in place of
// lesson_id, ownership resolved via course_modules instead of course_lessons. Only
// instructors ever reach this route — same reason as the lesson-quiz route: correct_answer
// must never be fetchable by a student who discovers the URL directly.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const moduleId = searchParams.get('moduleId');
    if (!moduleId) return NextResponse.json({ error: 'Missing moduleId parameter' }, { status: 400 });

    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { data: questions, error } = await adminClient
      .from('module_quiz_questions')
      .select('*')
      .eq('module_id', moduleId)
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ data: questions });
  } catch (err: any) {
    logger.error({ err }, 'lms.module_quiz_questions.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const body = await req.json();
    const {
      module_id,
      question_type,
      question_text,
      options = [],
      correct_answer,
      explanation = '',
      points = 1,
      position = 0
    } = body;

    if (!module_id || !question_type || !question_text) {
      return NextResponse.json({ error: 'Missing required fields: module_id, question_type, question_text' }, { status: 400 });
    }

    // Verify the target module actually belongs to the caller's own workspace before
    // attaching a question to it — module_id is never trusted blindly.
    const { data: moduleRow, error: moduleErr } = await adminClient
      .from('course_modules')
      .select('id')
      .eq('id', module_id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (moduleErr) throw moduleErr;
    if (!moduleRow) throw new ForbiddenError('You do not have access to this module');

    const { data: question, error } = await adminClient
      .from('module_quiz_questions')
      .insert({
        module_id,
        workspace_id: workspaceId,
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
    logger.error({ err }, 'lms.module_quiz_questions.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing question id parameter' }, { status: 400 });

    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const body = await req.json();
    const { question_type, question_text, options, correct_answer, explanation, points, position } = body;

    const updatePayload: any = {};
    if (question_type !== undefined) updatePayload.question_type = question_type;
    if (question_text !== undefined) updatePayload.question_text = question_text;
    if (options !== undefined) updatePayload.options = options;
    if (correct_answer !== undefined) updatePayload.correct_answer = correct_answer;
    if (explanation !== undefined) updatePayload.explanation = explanation;
    if (points !== undefined) updatePayload.points = points;
    if (position !== undefined) updatePayload.position = position;

    const { data: question, error } = await adminClient
      .from('module_quiz_questions')
      .update(updatePayload)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data: question });
  } catch (err: any) {
    logger.error({ err }, 'lms.module_quiz_questions.patch.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing question id parameter' }, { status: 400 });

    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const idList = id.split(',');
    const { error } = await adminClient
      .from('module_quiz_questions')
      .delete()
      .in('id', idList)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'lms.module_quiz_questions.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
