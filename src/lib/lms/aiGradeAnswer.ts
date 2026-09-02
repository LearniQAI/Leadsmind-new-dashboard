// Batch 3 (G6b) — OPT-IN AI-assisted semantic grading for short_answer / fill_blank.
//
// OFF by default. An instructor turns it on per question in the quiz workbench, which sets
// `quiz_questions.metadata.ai_grading = true`. When on, it is used ONLY as a fallback: a
// student answer that already passes the deterministic fuzzy matcher (quizGrading.ts) never
// triggers a call — so a correct answer costs nothing, and the non-determinism this
// introduces only ever applies to answers the cheap path judged wrong.
//
// Trade-off (stated so it's a conscious choice, per this project's no-silent-scope rule):
//   + catches genuine synonyms / rephrasings a fixed accepted-list can't anticipate.
//   - real per-submission OpenAI cost + latency, and a non-deterministic outcome: the same
//     borderline answer could be judged differently on a retry, unlike the fully
//     deterministic exact/fuzzy path. temperature:0 keeps it as stable as the API allows.
//
// Mock fallback (no real OPENAI_API_KEY): returns `false` — i.e. AI grading contributes
// nothing without a key, and the deterministic result stands. It never silently accepts.

import { getUsableOpenAIKey } from '@/lib/ai/openaiKey';
import { logger } from '@/shared/logger';
import { gradeSingleQuestion, MANUAL_REVIEW_TYPES, type QuizGradeResult } from './quizGrading';

const AI_GRADABLE_TYPES = new Set(['short_answer', 'fill_blank']);

/** Ask the model whether a student's answer is acceptable for one question. */
export async function aiJudgeAnswer(input: {
  questionText: string;
  studentAnswer: string;
  acceptedAnswers: string[];
}): Promise<boolean> {
  const student = (input.studentAnswer || '').trim();
  if (!student) return false;

  const key = getUsableOpenAIKey();
  if (!key) return false; // mock fallback — deterministic result stands

  const prompt = `You are grading one short free-text quiz answer.

Question: "${input.questionText}"
Answers the instructor explicitly accepts: ${input.acceptedAnswers.map((a) => `"${a}"`).join(', ') || '(none provided)'}
Student's answer: "${student}"

Is the student's answer correct — i.e. does it mean the same thing as one of the accepted
answers (a synonym, paraphrase, or equivalent form counts as correct; a different concept,
a blank, or a wrong value does not)? Reply with a raw JSON object only: {"correct": true} or
{"correct": false}.`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are a strict but fair short-answer grader. Output only the requested JSON.' },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, 'lms.ai_grade.openai_not_ok');
      return false;
    }
    const data = await res.json();
    const raw = (data.choices?.[0]?.message?.content || '').replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);
    return parsed?.correct === true;
  } catch (err) {
    logger.warn({ err }, 'lms.ai_grade.failed');
    return false; // any failure -> deterministic result stands
  }
}

/**
 * Second pass over an already-deterministically-graded result: for every question that is
 * (a) short_answer / fill_blank, (b) has metadata.ai_grading === true, (c) scored 0 on the
 * deterministic pass, and (d) has a non-empty student answer — ask the model. If it says the
 * answer is acceptable, award that question's full points and recompute score / passed.
 *
 * `base` is the output of gradeQuestionSet. `questions` are the raw rows (with metadata).
 * Returns a NEW result; if nothing qualifies it returns `base` unchanged (no API calls).
 */
export async function applyAiGradingPass(
  base: QuizGradeResult,
  questions: any[],
  answers: Record<string, any>,
  passPercentage: number,
): Promise<QuizGradeResult> {
  const candidates = (questions || []).filter((q) => {
    if (!AI_GRADABLE_TYPES.has(q.question_type)) return false;
    if (q?.metadata?.ai_grading !== true) return false;
    if (MANUAL_REVIEW_TYPES.has(q.question_type)) return false;
    // only worth an API call if the deterministic pass already scored it 0
    return gradeSingleQuestion(q, answers?.[q.id]).earned === 0;
  });

  if (candidates.length === 0) return base;

  let extra = 0;
  for (const q of candidates) {
    const points = Number(q.points) || 1;
    const ans = answers?.[q.id];

    if (q.question_type === 'short_answer') {
      const ok = await aiJudgeAnswer({
        questionText: q.question_text,
        studentAnswer: String(ans ?? ''),
        acceptedAnswers: q.correct_answer?.synonyms || [],
      });
      if (ok) extra += points;
    } else {
      // fill_blank — judge each still-wrong blank against its own accepted list; award the
      // question only if every blank is now acceptable.
      const blanks: { accepted: string[] }[] = q.metadata?.blanks || [];
      const arr = Array.isArray(ans) ? ans : [];
      if (blanks.length === 0 || arr.length !== blanks.length) continue;
      let allOk = true;
      for (let i = 0; i < blanks.length; i++) {
        // deterministic already handled the ones it could; re-judge only the failing blanks
        const detOk = gradeSingleQuestion(
          { question_type: 'fill_blank', points: 1, metadata: { blanks: [blanks[i]], case_sensitive: q.metadata?.case_sensitive } },
          [arr[i]],
        ).earned > 0;
        if (detOk) continue;
        const ok = await aiJudgeAnswer({
          questionText: q.question_text,
          studentAnswer: String(arr[i] ?? ''),
          acceptedAnswers: blanks[i].accepted || [],
        });
        if (!ok) { allOk = false; break; }
      }
      if (allOk) extra += points;
    }
  }

  if (extra === 0) return base;

  const rawScore = base.rawScore + extra;
  const autoRawScore = base.autoRawScore + extra;
  const score = base.maxScore > 0 ? Math.round((rawScore / base.maxScore) * 100) : 0;
  return {
    ...base,
    rawScore,
    autoRawScore,
    score,
    passed: !base.pendingManual && score >= (passPercentage ?? 70),
  };
}
