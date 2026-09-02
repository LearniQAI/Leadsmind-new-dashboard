import { createAdminClient } from '@/lib/supabase/server';
import { gradeQuestionSet } from './quizGrading';
import { applyAiGradingPass } from './aiGradeAnswer';
import type { QuizGradeResult } from './gradeQuiz';

// Module-Level Quiz — exact mirror of gradeQuizAttempt, reading module_quiz_questions /
// module_quiz_settings by module_id instead of the lesson-scoped tables (Step 1 schema
// decision: genuinely separate tables). All 8 question types graded via the shared
// gradeQuestionSet; file_upload sets pendingManual the same way.
export async function gradeModuleQuizAttempt(
  moduleId: string,
  answers: Record<string, any>,
): Promise<QuizGradeResult> {
  const adminClient = createAdminClient();

  const [{ data: questions }, { data: settings }] = await Promise.all([
    adminClient.from('module_quiz_questions').select('*').eq('module_id', moduleId),
    adminClient.from('module_quiz_settings').select('pass_percentage').eq('module_id', moduleId).maybeSingle(),
  ]);

  const passPct = settings?.pass_percentage ?? 70;
  const base = gradeQuestionSet(questions || [], answers || {}, passPct);
  return applyAiGradingPass(base, questions || [], answers || {}, passPct);
}
