import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { loadModuleQuizForWorkspace, touchModuleQuiz } from '@/lib/lms/moduleQuizzes';
import { ForbiddenError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Module-Level Quiz — mirrors /api/lms/quiz/questions, scoped to ONE module quiz (quiz_id)
// since a module can hold several (module_quizzes, migration 20260930000015). module_id is
// derived from the quiz, never taken from the request. Only instructors ever reach this route —
// same reason as the lesson-quiz route: correct_answer must never be fetchable by a student who
// discovers the URL directly.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const quizId = searchParams.get('quizId');
    if (!quizId) return NextResponse.json({ error: 'Missing quizId parameter' }, { status: 400 });

    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { data: questions, error } = await adminClient
      .from('module_quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
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
      quiz_id,
      question_type,
      question_text,
      options = [],
      correct_answer,
      metadata = {},   // Batch 2 — see quiz/questions/route.ts
      explanation = '',
      points = 1,
      position = 0
    } = body;

    if (!quiz_id || !question_type || !question_text) {
      return NextResponse.json({ error: 'Missing required fields: quiz_id, question_type, question_text' }, { status: 400 });
    }

    // The quiz must belong to the caller's own workspace; its module_id is what gets stored.
    const quiz = await loadModuleQuizForWorkspace(adminClient, quiz_id, workspaceId);
    if (!quiz) throw new ForbiddenError('You do not have access to this quiz');

    const { data: question, error } = await adminClient
      .from('module_quiz_questions')
      .insert({
        quiz_id: quiz.id,
        module_id: quiz.module_id,
        workspace_id: workspaceId,
        question_type,
        question_text,
        options,
        correct_answer,
        metadata,
        explanation,
        points,
        position
      })
      .select()
      .single();

    if (error) throw error;
    await touchModuleQuiz(adminClient, quiz.id);
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
    const { question_type, question_text, options, correct_answer, metadata, explanation, points, position } = body;

    const updatePayload: any = {};
    if (question_type !== undefined) updatePayload.question_type = question_type;
    if (question_text !== undefined) updatePayload.question_text = question_text;
    if (options !== undefined) updatePayload.options = options;
    if (correct_answer !== undefined) updatePayload.correct_answer = correct_answer;
    if (metadata !== undefined) updatePayload.metadata = metadata;
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
    await touchModuleQuiz(adminClient, question.quiz_id);
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
    const { data: deleted, error } = await adminClient
      .from('module_quiz_questions')
      .delete()
      .in('id', idList)
      .eq('workspace_id', workspaceId)
      .select('quiz_id');

    if (error) throw error;
    for (const quizId of new Set((deleted || []).map((r: any) => r.quiz_id))) {
      await touchModuleQuiz(adminClient, quizId);
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'lms.module_quiz_questions.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
