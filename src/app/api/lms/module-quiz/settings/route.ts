import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { loadModuleQuizForWorkspace, touchModuleQuiz } from '@/lib/lms/moduleQuizzes';
import { ForbiddenError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Module-Level Quiz — mirrors /api/lms/quiz/settings, one settings row per module quiz
// (quiz_id; a module can hold several since migration 20260930000015). Ownership is resolved
// through the quiz. Publish state lives on module_quizzes.status, not here.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const quizId = searchParams.get('quizId');
    if (!quizId) return NextResponse.json({ error: 'Missing quizId parameter' }, { status: 400 });

    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();
    if (!(await loadModuleQuizForWorkspace(adminClient, quizId, workspaceId))) {
      throw new ForbiddenError('You do not have access to this quiz');
    }

    const { data: settings, error } = await adminClient
      .from('module_quiz_settings')
      .select('*')
      .eq('quiz_id', quizId)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ data: settings });
  } catch (err: any) {
    logger.error({ err }, 'lms.module_quiz_settings.get.failed');
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
      time_limit_minutes = null,
      max_attempts = 3,
      pass_percentage = 70,
      show_answers_after = 'submission',
      randomize_questions = false,
      scheduled_at = null
    } = body;

    if (!quiz_id) {
      return NextResponse.json({ error: 'Missing required field: quiz_id' }, { status: 400 });
    }

    const quiz = await loadModuleQuizForWorkspace(adminClient, quiz_id, workspaceId);
    if (!quiz) throw new ForbiddenError('You do not have access to this quiz');

    const payload = {
      quiz_id: quiz.id,
      module_id: quiz.module_id,
      time_limit_minutes,
      max_attempts,
      pass_percentage,
      show_answers_after,
      randomize_questions,
      scheduled_at
    };

    const { data: settings, error } = await adminClient
      .from('module_quiz_settings')
      .upsert(payload, { onConflict: 'quiz_id' })
      .select()
      .single();

    if (error) throw error;
    await touchModuleQuiz(adminClient, quiz.id);
    return NextResponse.json({ data: settings });
  } catch (err: any) {
    logger.error({ err }, 'lms.module_quiz_settings.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function PATCH(req: NextRequest) {
  return POST(req);
}
