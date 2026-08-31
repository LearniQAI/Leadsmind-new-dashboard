import { createAdminClient } from '@/lib/supabase/server';
import type { QuizGradeResult } from './gradeQuiz';

// Module-Level Quiz — exact mirror of gradeQuizAttempt (gradeQuiz.ts), module_id in place of
// lesson_id against module_quiz_questions/module_quiz_settings. Kept as a real, separate
// function (not a parameterized version of gradeQuizAttempt) since the two read from
// genuinely different tables per the Step 1 schema decision — a shared implementation would
// need its own scope-branching for zero real benefit over two small, obviously-identical
// functions reading different tables.
const LIVE_GRADED_TYPES = new Set(['mcq', 'true_false', 'short_answer']);

export async function gradeModuleQuizAttempt(moduleId: string, answers: Record<string, any>): Promise<QuizGradeResult> {
  const adminClient = createAdminClient();

  const [{ data: questions }, { data: settings }] = await Promise.all([
    adminClient.from('module_quiz_questions').select('*').eq('module_id', moduleId),
    adminClient.from('module_quiz_settings').select('pass_percentage').eq('module_id', moduleId).maybeSingle(),
  ]);

  const allQuestions = questions || [];
  const maxScore = allQuestions.reduce((acc, q) => acc + (q.points || 1), 0);

  let rawScore = 0;
  for (const q of allQuestions) {
    const studentAns = answers?.[q.id];

    if (!LIVE_GRADED_TYPES.has(q.question_type)) {
      continue;
    }

    if (q.question_type === 'mcq' || q.question_type === 'true_false') {
      const correctIndex = q.correct_answer?.correct_option_index;
      const correctOption = q.options?.[correctIndex];
      if (correctOption && studentAns === correctOption.text) {
        rawScore += (q.points || 1);
      }
    } else if (q.question_type === 'short_answer') {
      const accepted: string[] = q.correct_answer?.synonyms || [];
      const isMatch = accepted.some((syn) =>
        syn.trim().toLowerCase() === String(studentAns || '').trim().toLowerCase()
      );
      if (isMatch) {
        rawScore += (q.points || 1);
      }
    }
  }

  const score = maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : 0;
  const passThreshold = settings?.pass_percentage ?? 70;
  const passed = score >= passThreshold;

  return { score, passed, rawScore, maxScore };
}
