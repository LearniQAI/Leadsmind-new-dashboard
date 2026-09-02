import { createAdminClient } from '@/lib/supabase/server';
import { gradeQuestionSet, type QuizGradeResult } from './quizGrading';
import { applyAiGradingPass } from './aiGradeAnswer';

export type { QuizGradeResult } from './quizGrading';

// Independently recomputes a quiz attempt's score and pass/fail status server-side from the
// student's submitted answers — a client-supplied score or pass field is never trusted.
//
// Batch 2: all 8 question types are now graded (see src/lib/lms/quizGrading.ts):
//   mcq, true_false, short_answer, matching, ordering, fill_blank, code -> auto-graded here.
//   file_upload                                                         -> NOT auto-gradable;
//     its presence sets result.pendingManual = true, and submitQuizAttempt then holds the
//     attempt in 'pending_review' until an instructor grades the upload(s).
export async function gradeQuizAttempt(
  lessonId: string,
  answers: Record<string, any>,
): Promise<QuizGradeResult> {
  const adminClient = createAdminClient();

  const [{ data: questions }, { data: settings }] = await Promise.all([
    adminClient.from('quiz_questions').select('*').eq('lesson_id', lessonId),
    adminClient.from('quiz_settings').select('pass_percentage').eq('lesson_id', lessonId).maybeSingle(),
  ]);

  const passPct = settings?.pass_percentage ?? 70;
  const base = gradeQuestionSet(questions || [], answers || {}, passPct);
  // Opt-in AI grading pass (default off; only calls OpenAI for ai_grading questions the
  // deterministic pass scored 0). A no-op when no question has metadata.ai_grading.
  return applyAiGradingPass(base, questions || [], answers || {}, passPct);
}
