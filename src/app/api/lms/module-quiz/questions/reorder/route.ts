import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { touchModuleQuiz } from '@/lib/lms/moduleQuizzes';
import { parseReorderIds, reorderQuizQuestions, ReorderError } from '@/lib/lms/quizQuestionReorder';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// PATCH /api/lms/module-quiz/questions/reorder  { quizId, ids: [questionId, ...] }  — ids in the new order.
// Atomic (one Postgres function); changes question position only.
export async function PATCH(req: NextRequest) {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const body = await req.json().catch(() => ({}));
    const ids = parseReorderIds(body?.ids);
    if (typeof body?.quizId !== 'string') throw new ReorderError(400, 'INVALID_IDS', 'quizId is required');

    const db = createAdminClient();
    await reorderQuizQuestions(db, { scope: 'module', parentId: body.quizId, workspaceId, ids });
    await touchModuleQuiz(db, body.quizId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err instanceof ReorderError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    logger.error({ err }, 'lms.module_quiz_questions.reorder.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
