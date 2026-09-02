// Shared, pure quiz-grading + question-shaping logic for BOTH the lesson-quiz path
// (gradeQuiz.ts / quiz_questions) and the module-quiz path (gradeModuleQuiz.ts /
// module_quiz_questions). No DB access here — the two graders fetch their own rows from their
// own tables and hand them to these functions, so this stays unit-testable and safe to import
// from a server component (buildClientQuestion is called in the student quiz page).
//
// Batch 2 (Missing Quiz Question Types): before this, only mcq / true_false / short_answer had
// real grading; matching / ordering / fill_blank / code / file_upload were counted in maxScore
// but always earned 0. Now:
//   - matching, ordering, fill_blank, code  -> fully auto-graded (all-or-nothing per question,
//     same as the 3 existing types). `code` is graded by NORMALIZED-TEXT match against stored
//     accepted solutions — it does NOT run the student's code (see gradeSingleQuestion).
//   - file_upload -> NOT auto-graded: contributes to maxScore, earns 0 automatically, and its
//     presence puts the whole attempt into 'pending_review' until an instructor grades it.

export type QuizQuestionType =
  | 'mcq' | 'true_false' | 'short_answer'
  | 'matching' | 'ordering' | 'fill_blank' | 'code' | 'file_upload';

// Types with real server-side auto-grading. file_upload is deliberately NOT here.
export const LIVE_GRADED_TYPES: ReadonlySet<string> = new Set([
  'mcq', 'true_false', 'short_answer', 'matching', 'ordering', 'fill_blank', 'code',
]);

// Types that require a human grader. A quiz containing any of these is no longer "instant".
export const MANUAL_REVIEW_TYPES: ReadonlySet<string> = new Set(['file_upload']);

export interface QuizGradeResult {
  score: number;         // final percentage 0-100 (auto portion only while pendingManual)
  passed: boolean;       // score >= pass threshold (always false while pendingManual)
  rawScore: number;      // points earned (auto portion only while pendingManual)
  maxScore: number;      // total points possible across every question
  autoRawScore: number;  // points earned from auto-graded questions (== rawScore unless a
                         //   later manual review adds more)
  pendingManual: boolean; // quiz has >= 1 file_upload question -> hold attempt for review
}

/* ------------------------------------------------------------------ text helpers */

const normalizeText = (s: unknown, caseSensitive = false): string => {
  const t = String(s ?? '').trim().replace(/\s+/g, ' ');
  return caseSensitive ? t : t.toLowerCase();
};

/** Shared accepted-answers match — the SAME rule short_answer already used (case-insensitive
 *  exact match against a list), reused verbatim for each fill_blank blank. */
export const matchesAccepted = (
  answer: unknown,
  accepted: unknown[],
  caseSensitive = false,
): boolean => {
  const a = normalizeText(answer, caseSensitive);
  if (!a) return false;
  return (accepted || []).some((acc) => normalizeText(acc, caseSensitive) === a);
};

/** Whitespace-normalized code compare (NOT execution): trims each line, collapses interior
 *  runs of whitespace to a single space, drops blank lines and all line-end differences, so
 *  formatting / indentation / CRLF don't cause false negatives. */
export const normalizeCodeSubmission = (s: unknown): string =>
  String(s ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .filter((line) => line.length > 0)
    .join('\n');

/* ------------------------------------------------------------------ per-question grading */

export interface SingleGradeResult {
  /** points earned by auto-grading this question (0 for file_upload) */
  earned: number;
  /** true when this question can only be scored by a human (file_upload) */
  manual: boolean;
}

/**
 * Grade one question against one student answer. Pure. All question types are all-or-nothing
 * per question (earn full `points` or 0) — matching the existing mcq/true_false/short_answer
 * behaviour rather than introducing partial credit for only the new types.
 *
 * Expected `studentAns` shapes (what StudentQuizClient stores in answers[question.id]):
 *   mcq / true_false : string (the chosen option's text)
 *   short_answer     : string
 *   matching         : { [leftItemText]: chosenRightItemText }
 *   ordering         : string[]  (the student's ordering of the items)
 *   fill_blank       : string[]  (one entry per [blank], in order)
 *   code             : string
 *   file_upload      : { file_url, file_name, file_size? }  -> always manual
 */
export function gradeSingleQuestion(question: any, studentAns: any): SingleGradeResult {
  const points = Number(question?.points) || 1;
  const type = question?.question_type as string;
  const meta = question?.metadata || {};

  if (type === 'mcq' || type === 'true_false') {
    const correctIndex = question?.correct_answer?.correct_option_index;
    const correctOption = question?.options?.[correctIndex];
    return { earned: correctOption && studentAns === correctOption.text ? points : 0, manual: false };
  }

  if (type === 'short_answer') {
    const accepted: string[] = question?.correct_answer?.synonyms || [];
    const caseSensitive = !!(question?.metadata?.case_sensitive);
    return { earned: matchesAccepted(studentAns, accepted, caseSensitive) ? points : 0, manual: false };
  }

  if (type === 'matching') {
    const pairs: { left: string; right: string }[] = meta.pairs || [];
    if (pairs.length === 0 || !studentAns || typeof studentAns !== 'object') return { earned: 0, manual: false };
    const allRight = pairs.every(
      (p) => normalizeText(studentAns[p.left]) === normalizeText(p.right) && normalizeText(p.right) !== '',
    );
    return { earned: allRight ? points : 0, manual: false };
  }

  if (type === 'ordering') {
    const correct: string[] = meta.items || [];
    if (correct.length === 0 || !Array.isArray(studentAns) || studentAns.length !== correct.length) {
      return { earned: 0, manual: false };
    }
    const exact = correct.every((item, i) => normalizeText(item) === normalizeText(studentAns[i]));
    return { earned: exact ? points : 0, manual: false };
  }

  if (type === 'fill_blank') {
    const blanks: { accepted: string[] }[] = meta.blanks || [];
    const caseSensitive = !!meta.case_sensitive;
    if (blanks.length === 0 || !Array.isArray(studentAns) || studentAns.length !== blanks.length) {
      return { earned: 0, manual: false };
    }
    const allRight = blanks.every((b, i) => matchesAccepted(studentAns[i], b.accepted || [], caseSensitive));
    return { earned: allRight ? points : 0, manual: false };
  }

  if (type === 'code') {
    const accepted: string[] = meta.accepted_solutions || [];
    if (accepted.length === 0) return { earned: 0, manual: false };
    const norm = normalizeCodeSubmission(studentAns);
    if (!norm) return { earned: 0, manual: false };
    const hit = accepted.some((sol) => normalizeCodeSubmission(sol) === norm);
    return { earned: hit ? points : 0, manual: false };
  }

  if (type === 'file_upload') {
    return { earned: 0, manual: true };
  }

  // Unknown type — counted in maxScore by the caller, earns nothing. (Shouldn't happen: the
  // DB CHECK constraint only allows the 8 handled above.)
  return { earned: 0, manual: false };
}

/**
 * Grade a full set of questions against a full answers map. Shared by gradeQuizAttempt and
 * gradeModuleQuizAttempt — they differ only in which table the rows and pass_percentage came
 * from.
 */
export function gradeQuestionSet(
  questions: any[],
  answers: Record<string, any>,
  passPercentage: number,
): QuizGradeResult {
  const all = questions || [];
  const maxScore = all.reduce((acc, q) => acc + (Number(q?.points) || 1), 0);

  let autoRawScore = 0;
  let pendingManual = false;

  for (const q of all) {
    const res = gradeSingleQuestion(q, answers?.[q.id]);
    if (res.manual) pendingManual = true;
    else autoRawScore += res.earned;
  }

  const rawScore = autoRawScore;
  const score = maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : 0;
  const threshold = passPercentage ?? 70;
  // A pending_review attempt is never "passed" yet — it has unscored questions.
  const passed = !pendingManual && score >= threshold;

  return { score, passed, rawScore, maxScore, autoRawScore, pendingManual };
}

/**
 * Recompute the FINAL result of a previously-pending attempt once an instructor has assigned
 * points to its file_upload question(s). `manualAwards` is { questionId: pointsAwarded },
 * each clamped to [0, question.points]. Used by the instructor grading action.
 */
export function gradeWithManualAwards(
  questions: any[],
  answers: Record<string, any>,
  manualAwards: Record<string, number>,
  passPercentage: number,
): QuizGradeResult {
  const all = questions || [];
  const maxScore = all.reduce((acc, q) => acc + (Number(q?.points) || 1), 0);

  let autoRawScore = 0;
  let manualRawScore = 0;

  for (const q of all) {
    const points = Number(q?.points) || 1;
    if (MANUAL_REVIEW_TYPES.has(q.question_type)) {
      const raw = Number(manualAwards?.[q.id]) || 0;
      manualRawScore += Math.max(0, Math.min(points, raw));
    } else {
      autoRawScore += gradeSingleQuestion(q, answers?.[q.id]).earned;
    }
  }

  const rawScore = autoRawScore + manualRawScore;
  const score = maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : 0;
  const threshold = passPercentage ?? 70;
  return {
    score,
    passed: score >= threshold,
    rawScore,
    maxScore,
    autoRawScore,
    pendingManual: false,
  };
}

/* ------------------------------------------------------------------ client shaping */

/** Deterministic shuffle seeded by a string (the question id) — so re-renders of the same
 *  question keep the same option order within a session, but different questions differ. */
export function stableShuffle<T>(arr: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rng = () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Strip a question row to what the STUDENT client is allowed to see, per type:
 *   - mcq / true_false / short_answer: unchanged (their `correct_answer` is still sent — the
 *     client does an optimistic preview grade for these 3, exactly as before this batch; the
 *     server remains the source of truth).
 *   - matching / ordering / fill_blank / code / file_upload: `metadata` and `correct_answer`
 *     are removed entirely and replaced with a safe `presentation` object — the correct
 *     pairing / order / accepted answers / accepted code solutions never reach the browser.
 *
 * Call this in the server component that loads questions before passing them to
 * StudentQuizClient (both the lesson-quiz page and the module-quiz page).
 */
export function buildClientQuestion(q: any): any {
  const base = {
    id: q.id,
    question_type: q.question_type,
    question_text: q.question_text,
    points: q.points,
    position: q.position,
    explanation: q.explanation,
  };

  switch (q.question_type) {
    case 'mcq':
    case 'true_false':
      return { ...base, options: q.options || [], correct_answer: q.correct_answer || {} };

    case 'short_answer':
      return { ...base, correct_answer: q.correct_answer || {} };

    case 'matching': {
      const pairs: { left: string; right: string }[] = q.metadata?.pairs || [];
      return {
        ...base,
        presentation: {
          leftItems: pairs.map((p) => p.left),
          rightItems: stableShuffle(pairs.map((p) => p.right), q.id),
        },
      };
    }

    case 'ordering': {
      const items: string[] = q.metadata?.items || [];
      return { ...base, presentation: { items: stableShuffle(items, q.id) } };
    }

    case 'fill_blank': {
      const text: string = q.metadata?.text_with_blanks || q.question_text || '';
      const blankCount = (text.match(/\[blank\]/g) || []).length;
      return { ...base, presentation: { text_with_blanks: text, blankCount } };
    }

    case 'code':
      return { ...base, presentation: { starter_template: q.metadata?.starter_template || '' } };

    case 'file_upload':
      return { ...base, presentation: { rubric_criteria: q.metadata?.rubric_criteria || [] } };

    default:
      return base;
  }
}
