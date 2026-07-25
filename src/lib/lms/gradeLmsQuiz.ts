import { createAdminClient } from '@/lib/supabase/server';

export interface LmsQuizGradeResult {
  score: number;       // percentage, 0-100
  passed: boolean;
  rawScore: number;    // points earned
  maxScore: number;    // total points possible
}

// Question types with a real, deterministic correct answer stored by the quiz builder
// (QuizBuilder.tsx) today. 'fill_in_blank' is deliberately excluded: the builder only ever
// stores the blanked sentence text (metadata.text_with_blanks), never an accepted answer for
// the blanks — there is no ground truth to grade against. 'code_challenge' has no real code
// execution (the client's "Run Code" is a simulated/fake pass), and 'file_upload' inherently
// requires human review. All three are graded as 0 points earned (still counted toward
// maxScore) rather than given free credit — mirroring gradeQuiz.ts's LIVE_GRADED_TYPES
// pattern for this engine's own set of unsupported types.
const AUTO_GRADED_TYPES = new Set(['multiple_choice', 'true_false', 'short_answer', 'matching', 'ordering']);

// Independently recomputes an lms_quizzes attempt's score and pass/fail status server-side
// from the student's submitted per-question answers — a client-supplied score or status is
// never trusted, even if present in the request.
export async function gradeLmsQuizAttempt(quizId: string, answers: Record<string, any>): Promise<LmsQuizGradeResult> {
  const adminClient = createAdminClient();

  const [{ data: questions }, { data: quiz }] = await Promise.all([
    adminClient.from('lms_questions').select('*').eq('quiz_id', quizId),
    adminClient.from('lms_quizzes').select('passing_score').eq('id', quizId).maybeSingle(),
  ]);

  const allQuestions = questions || [];
  const maxScore = allQuestions.reduce((acc, q) => acc + (q.points || 1), 0);

  let rawScore = 0;
  for (const q of allQuestions) {
    const studentAns = answers?.[q.id];
    const options = q.options || [];

    if (!AUTO_GRADED_TYPES.has(q.type)) {
      continue; // no deterministic ground truth for this type — 0 points, still counted in maxScore
    }

    if (q.type === 'true_false') {
      // studentAns is a boolean; options[0] is the "True" option, options[1] is "False".
      const correctOpt = options.find((o: any) => o.is_correct);
      const studentOpt = options[studentAns ? 0 : 1];
      if (correctOpt && studentOpt && correctOpt.text === studentOpt.text) {
        rawScore += (q.points || 1);
      }
    } else if (q.type === 'multiple_choice') {
      const correctIndices = options
        .map((o: any, idx: number) => (o.is_correct ? idx : -1))
        .filter((idx: number) => idx !== -1);
      const selected = Array.isArray(studentAns) ? studentAns : [];
      const isMatch = selected.length === correctIndices.length &&
        selected.every((idx: number) => correctIndices.includes(idx));
      if (isMatch) {
        rawScore += (q.points || 1);
      }
    } else if (q.type === 'short_answer') {
      const meta = q.metadata || {};
      const synonyms: string[] = q.correct_answer?.synonyms || [];
      const trimmed = String(studentAns || '').trim();
      const testVal = meta.case_sensitive ? trimmed : trimmed.toLowerCase();
      const isMatch = trimmed.length > 0 && synonyms.some((syn: string) =>
        (meta.case_sensitive ? syn.trim() : syn.trim().toLowerCase()) === testVal
      );
      if (isMatch) {
        rawScore += (q.points || 1);
      }
    } else if (q.type === 'matching') {
      const pairs = q.metadata?.pairs || [];
      const selections = studentAns || {};
      const isMatch = pairs.length > 0 && pairs.every((p: any) => selections[p.left] === p.right);
      if (isMatch) {
        rawScore += (q.points || 1);
      }
    } else if (q.type === 'ordering') {
      const correctOrder = q.metadata?.items || [];
      const list = Array.isArray(studentAns) ? studentAns : [];
      const isMatch = correctOrder.length > 0 && list.length === correctOrder.length &&
        list.every((val: any, idx: number) => val === correctOrder[idx]);
      if (isMatch) {
        rawScore += (q.points || 1);
      }
    }
  }

  const score = maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : 0;
  const passThreshold = quiz?.passing_score ?? 80;
  const passed = score >= passThreshold;

  return { score, passed, rawScore, maxScore };
}
