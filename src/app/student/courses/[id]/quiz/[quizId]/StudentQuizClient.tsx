'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronRight, AlertTriangle, Loader2, Award, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { submitQuizAttempt, submitModuleQuizAttempt } from '@/app/actions/studentProgress';

interface StudentQuizClientProps {
  courseId: string;
  quiz: any;
  questions: any[];
  settings: any;
  attemptsCount: number;
  hasPassedRemedial: boolean;
  /** Module-Level Quiz pass — submits via submitModuleQuizAttempt against this module
   *  instead of submitQuizAttempt against quiz.id as a lesson. Same UI either way. */
  moduleId?: string;
}

/* Shared premium light-theme controls (match the lesson player's buttons). */
const btnPrimary =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-dash-accent px-5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-dash-accent/90 disabled:cursor-not-allowed disabled:opacity-50';
const btnSecondary =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-dash-border bg-white px-5 text-[12px] font-semibold !text-dash-text transition-colors hover:bg-dash-surface disabled:cursor-not-allowed disabled:opacity-50';
const btnSubmit =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-6 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50';
const card =
  'rounded-2xl border border-dash-border bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:p-8';
const eyebrow = 'text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-600';

export default function StudentQuizClient({
  courseId,
  quiz,
  questions,
  settings,
  attemptsCount,
  hasPassedRemedial,
  moduleId,
}: StudentQuizClientProps) {
  const isModuleScope = !!moduleId;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [passed, setPassed] = useState(false);

  const activeQuestion = questions[currentIndex] || null;

  const handleGradeQuiz = () => {
    let scoreTotal = 0;
    const totalPoints = questions.reduce((acc, q) => acc + (q.points || 1), 0);

    questions.forEach((q) => {
      const studentAns = answers[q.id];
      if (q.question_type === 'mcq' || q.question_type === 'true_false') {
        const correctIndex = q.correct_answer?.correct_option_index;
        const correctOption = q.options?.[correctIndex];
        if (correctOption && studentAns === correctOption.text) {
          scoreTotal += q.points || 1;
        }
      } else if (q.question_type === 'short_answer') {
        const accepted = q.correct_answer?.synonyms || [];
        const isMatch = accepted.some(
          (syn: string) => syn.trim().toLowerCase() === (studentAns || '').trim().toLowerCase()
        );
        if (isMatch) scoreTotal += q.points || 1;
      }
    });

    const scorePercentage = totalPoints > 0 ? Math.round((scoreTotal / totalPoints) * 100) : 0;
    const passThreshold = settings?.pass_percentage ?? 70;
    const isPassed = scorePercentage >= passThreshold;

    setFinalScore(scorePercentage);
    setPassed(isPassed);

    startTransition(async () => {
      try {
        const res = isModuleScope
          ? await submitModuleQuizAttempt({ courseId, moduleId: moduleId!, answers })
          : await submitQuizAttempt({ courseId, lessonId: quiz.id, answers });
        if (res.error) toast.error(res.error);
        else {
          setFinalScore(res.score);
          setPassed(res.passed);
          toast.success(
            res.passed
              ? 'Congratulations! You passed the quiz.'
              : 'Attempt recorded. Please review the material and try again.'
          );
          setIsSubmitted(true);
        }
      } catch {
        toast.error('Failed to log quiz results');
      }
    });
  };

  if (questions.length === 0) {
    return (
      <div className={`${card} text-center`}>
        <AlertTriangle className="mx-auto text-amber-500" size={28} />
        <h3 className="mt-3 font-display text-[15px] font-semibold !text-dash-text">Empty assessment</h3>
        <p className="mx-auto mt-1.5 max-w-sm text-[12px] leading-relaxed !text-dash-textMuted">
          This quiz contains no questions yet. Please notify your instructor.
        </p>
        <button onClick={() => router.push(`/student/courses/${courseId}`)} className={`${btnSecondary} mt-5`}>
          Back to course
        </button>
      </div>
    );
  }

  const maxAttempts = settings?.max_attempts || 3;
  const isLocked = attemptsCount >= maxAttempts && !(isModuleScope || hasPassedRemedial);

  if (isLocked) {
    return (
      <div className={`${card} space-y-5 text-center`}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-500/15">
          <AlertTriangle size={26} />
        </div>
        <div className="space-y-1.5">
          <span className={`${eyebrow} block`}>Attempts used</span>
          <h2 className="font-display text-[19px] font-semibold !text-dash-text">Attempts exceeded</h2>
          <p className="mx-auto max-w-md text-[12px] leading-relaxed !text-dash-textMuted">
            You&apos;ve used all {attemptsCount} allowed attempts for this assessment.
            {isModuleScope
              ? ' Contact your instructor to reset your attempts.'
              : ' Complete the AI-powered remedial learning path to unlock the quiz.'}
          </p>
        </div>
        {!isModuleScope && (
          <button
            onClick={() => router.push(`/student/courses/${courseId}/remedial?lessonId=${quiz.id}`)}
            className={`${btnPrimary} w-full`}
          >
            Start AI remedial session
          </button>
        )}
        <div className="border-t border-dash-border pt-4">
          <button onClick={() => router.push(`/student/courses/${courseId}`)} className={`${btnSecondary} w-full`}>
            Back to course
          </button>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className={`${card} space-y-7`}>
        <div className="space-y-3 text-center">
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ring-1 ring-inset ${
              passed
                ? 'bg-emerald-50 text-emerald-600 ring-emerald-500/15'
                : 'bg-rose-50 text-rose-600 ring-rose-500/15'
            }`}
          >
            {passed ? <Award size={26} /> : <XCircle size={26} />}
          </div>
          <div className="space-y-1">
            <span className={`${eyebrow} block`}>Assessment result</span>
            <h2 className="font-display text-[20px] font-semibold !text-dash-text">
              {passed ? 'Assessment passed' : 'Assessment not passed'}
            </h2>
            <p className="text-[12px] !text-dash-textMuted">
              Passing threshold: {settings?.pass_percentage ?? 70}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-dash-border bg-dash-surface/50 p-5">
          <div className="border-r border-dash-border text-center">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] !text-dash-textMuted">
              Your score
            </span>
            <span
              className={`mt-1 block font-display text-[28px] font-bold ${
                passed ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {finalScore}%
            </span>
          </div>
          <div className="text-center">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] !text-dash-textMuted">
              Status
            </span>
            <span
              className={`mt-1 block font-display text-[28px] font-bold ${
                passed ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {passed ? 'PASS' : 'FAIL'}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="border-b border-dash-border pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] !text-dash-textMuted">
            Review &amp; rationales
          </h3>
          <div className="max-h-[34vh] space-y-3 overflow-y-auto pr-1">
            {questions.map((q, idx) => {
              const studentAns = answers[q.id];
              const isCorrectMCQ =
                (q.question_type === 'mcq' || q.question_type === 'true_false') &&
                q.options?.[q.correct_answer?.correct_option_index]?.text === studentAns;
              const isCorrectSA =
                q.question_type === 'short_answer' &&
                (q.correct_answer?.synonyms || []).some(
                  (s: string) => s.trim().toLowerCase() === (studentAns || '').trim().toLowerCase()
                );
              const isCorrect = isCorrectMCQ || isCorrectSA;

              return (
                <div key={q.id} className="space-y-2.5 rounded-xl border border-dash-border bg-white p-4">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] !text-dash-textMuted">
                    Q{idx + 1} · {q.question_type.replace('_', ' ')}
                  </span>
                  <p className="text-[13px] font-semibold !text-dash-text">{q.question_text}</p>
                  <div className="space-y-1 text-[12px]">
                    <p className="!text-dash-textMuted">
                      Your answer:{' '}
                      <strong className={isCorrect ? 'text-emerald-600' : 'text-rose-600'}>
                        {studentAns || 'Unanswered'}
                      </strong>
                    </p>
                    {!isCorrect && (
                      <p className="text-emerald-600">
                        Correct answer:{' '}
                        <strong>
                          {q.question_type === 'short_answer'
                            ? (q.correct_answer?.synonyms || []).join(', ')
                            : q.options?.[q.correct_answer?.correct_option_index]?.text || 'No answer set'}
                        </strong>
                      </p>
                    )}
                  </div>
                  {q.explanation && (
                    <div className="rounded-lg border border-sky-100 bg-sky-50/60 p-3 text-[11px] italic leading-relaxed text-sky-800">
                      <strong className="not-italic">Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {!passed && !isModuleScope && (
            <button
              onClick={() => router.push(`/student/courses/${courseId}/remedial?lessonId=${quiz.id}`)}
              className={`${btnPrimary} w-full`}
            >
              Start AI remedial session
            </button>
          )}
          <button
            onClick={() => router.push(`/student/courses/${courseId}`)}
            className={`${passed ? btnPrimary : btnSecondary} w-full`}
          >
            Back to course
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${card} space-y-6`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dash-border pb-3">
        <div>
          <span className={eyebrow}>Assessment quiz</span>
          <h2 className="mt-0.5 font-display text-[16px] font-semibold !text-dash-text">{quiz.title}</h2>
        </div>
        <span className="text-[12px] font-semibold text-sky-600">
          Question {currentIndex + 1} of {questions.length}
        </span>
      </div>

      {/* Question */}
      <div className="space-y-3 rounded-xl border border-dash-border bg-dash-surface/50 p-4">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-600">
          {activeQuestion.question_type.replace('_', ' ')}
        </span>
        <h3 className="text-[14px] font-semibold leading-relaxed !text-dash-text">
          {activeQuestion.question_text}
        </h3>
      </div>

      {/* Answers */}
      <div className="space-y-3 pt-1">
        {(activeQuestion.question_type === 'mcq' || activeQuestion.question_type === 'true_false') && (
          <div className="space-y-2.5">
            {activeQuestion.options?.map((opt: any, idx: number) => {
              const selected = answers[activeQuestion.id] === opt.text;
              return (
                <label
                  key={idx}
                  className={`flex cursor-pointer select-none items-center gap-3 rounded-xl border p-3.5 transition-colors ${
                    selected
                      ? 'border-sky-500 bg-sky-50 !text-dash-text'
                      : 'border-dash-border bg-white !text-dash-text hover:bg-dash-surface'
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${activeQuestion.id}`}
                    checked={selected}
                    onChange={() => setAnswers({ ...answers, [activeQuestion.id]: opt.text })}
                    className="h-4 w-4 shrink-0 accent-sky-600"
                  />
                  <span className={`text-[13px] ${selected ? 'font-semibold' : ''}`}>{opt.text}</span>
                </label>
              );
            })}
          </div>
        )}

        {activeQuestion.question_type === 'short_answer' && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] !text-dash-textMuted">
              Type your response
            </span>
            <input
              type="text"
              value={answers[activeQuestion.id] || ''}
              onChange={(e) => setAnswers({ ...answers, [activeQuestion.id]: e.target.value })}
              placeholder="Your answer"
              className="w-full rounded-xl border border-dash-border bg-white px-4 py-3 text-[13px] !text-dash-text outline-none transition-colors placeholder:!text-dash-textMuted focus:border-sky-500 focus:ring-4 focus:ring-sky-500/12"
            />
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="mt-2 flex items-center justify-between border-t border-dash-border pt-5">
        <button
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex(currentIndex - 1)}
          className={btnSecondary}
        >
          Previous
        </button>

        {currentIndex < questions.length - 1 ? (
          <button onClick={() => setCurrentIndex(currentIndex + 1)} className={btnPrimary}>
            Next question <ChevronRight size={14} />
          </button>
        ) : (
          <button onClick={handleGradeQuiz} disabled={isPending} className={btnSubmit}>
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> Submitting…
              </>
            ) : (
              'Submit assessment'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
