import { createAdminClient } from '@/lib/supabase/server';
import { gradeQuestionSet } from './quizGrading';
import { applyAiGradingPass } from './aiGradeAnswer';
import { getEffectiveQuizSettingsFor } from './moduleQuizSettings';
import type { QuizGradeResult } from './gradeQuiz';

// Module-Level Quiz — exact mirror of gradeQuizAttempt, reading module_quiz_questions for ONE
// module quiz (quiz_id — a module can hold several since migration 20260930000015) instead of
// the lesson-scoped tables. The pass mark is the quiz's EFFECTIVE one (module default or its own
// override — see moduleQuizSettings.ts). All 8 question types graded via the shared
// gradeQuestionSet; file_upload sets pendingManual the same way.
export async function gradeModuleQuizAttempt(
  quizId: string,
  answers: Record<string, any>,
  moduleId?: string,
): Promise<QuizGradeResult> {
  const adminClient = createAdminClient();

  let resolvedModuleId = moduleId;
  if (!resolvedModuleId) {
    const { data: quiz } = await adminClient.from('module_quizzes').select('module_id').eq('id', quizId).maybeSingle();
    resolvedModuleId = quiz?.module_id;
  }

  const [{ data: questions }, effective] = await Promise.all([
    adminClient.from('module_quiz_questions').select('*').eq('quiz_id', quizId),
    getEffectiveQuizSettingsFor(adminClient, { id: quizId, module_id: resolvedModuleId as string }),
  ]);

  const passPct = effective.passPercentage;
  const base = gradeQuestionSet(questions || [], answers || {}, passPct);
  return applyAiGradingPass(base, questions || [], answers || {}, passPct);
}
