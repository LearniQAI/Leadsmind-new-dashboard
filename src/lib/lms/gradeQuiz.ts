import { createAdminClient } from '@/lib/supabase/server';

export interface QuizGradeResult {
  score: number;       // percentage, 0-100
  passed: boolean;
  rawScore: number;    // points earned
  maxScore: number;    // total points possible
}

// Question types with real, live student-facing answer UI today (StudentQuizClient.tsx).
// The other question_type values the schema allows ('matching', 'ordering', 'fill_blank',
// 'code', 'file_upload') can be attached to the same lesson by the admin quiz builder, but
// have no answerable UI for a student — grading treats them as unanswerable (0 points
// earned, but still counted in the total possible points) rather than the old client-side
// bug of awarding full credit for any non-empty answer. Unifying real grading for those
// types is a separate Milestone 3 task.
const LIVE_GRADED_TYPES = new Set(['mcq', 'true_false', 'short_answer']);

// Independently recomputes a quiz attempt's score and pass/fail status server-side from the
// student's submitted answers (which option/text they picked per question id) — a
// client-supplied score or pass field is never trusted, even if present in the request.
export async function gradeQuizAttempt(lessonId: string, answers: Record<string, any>): Promise<QuizGradeResult> {
  const adminClient = createAdminClient();

  const [{ data: questions }, { data: settings }] = await Promise.all([
    adminClient.from('quiz_questions').select('*').eq('lesson_id', lessonId),
    adminClient.from('quiz_settings').select('pass_percentage').eq('lesson_id', lessonId).maybeSingle(),
  ]);

  const allQuestions = questions || [];
  const maxScore = allQuestions.reduce((acc, q) => acc + (q.points || 1), 0);

  let rawScore = 0;
  for (const q of allQuestions) {
    const studentAns = answers?.[q.id];

    if (!LIVE_GRADED_TYPES.has(q.question_type)) {
      continue; // unanswerable question type — 0 points, still counted in maxScore above
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
