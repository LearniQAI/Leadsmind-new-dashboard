'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  ChevronRight, AlertTriangle, Loader2, Award, XCircle, GripVertical, Upload, FileText, Clock3,
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
const fieldLabel = 'text-[10px] font-semibold uppercase tracking-[0.12em] !text-dash-textMuted';
const textInput =
  'w-full rounded-xl border border-dash-border bg-white px-4 py-3 text-[13px] !text-dash-text outline-none transition-colors placeholder:!text-dash-textMuted focus:border-sky-500 focus:ring-4 focus:ring-sky-500/12';

// Question types the client CAN preview-grade locally (their answer key is still sent to the
// browser). For every other type the browser has no key — the server result is the only score
// shown, so we don't flash an optimistic number.
const CLIENT_PREVIEWABLE = new Set(['mcq', 'true_false', 'short_answer']);

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
  const [pendingReview, setPendingReview] = useState(false);
  const [uploadingQid, setUploadingQid] = useState<string | null>(null);

  const activeQuestion = questions[currentIndex] || null;
  const setAnswer = (qId: string, value: any) => setAnswers((prev) => ({ ...prev, [qId]: value }));

  const hasFileUploadQuestion = questions.some((q) => q.question_type === 'file_upload');
  const allPreviewable = questions.every((q) => CLIENT_PREVIEWABLE.has(q.question_type));

  const handleFileUpload = async (qId: string, file: File) => {
    setUploadingQid(qId);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('pathPrefix', 'student-assignments');
      const res = await fetch('/api/lms/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.url) {
        toast.error(json.error || 'Upload failed');
        return;
      }
      setAnswer(qId, { file_url: json.url, file_name: file.name, file_size: file.size });
      toast.success('File attached');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploadingQid(null);
    }
  };

  const handleSubmit = () => {
    // Optimistic local score — ONLY when every question is a type the browser can grade.
    if (allPreviewable) {
      let scoreTotal = 0;
      const totalPoints = questions.reduce((acc, q) => acc + (q.points || 1), 0);
      questions.forEach((q) => {
        const studentAns = answers[q.id];
        if (q.question_type === 'mcq' || q.question_type === 'true_false') {
          const correctOption = q.options?.[q.correct_answer?.correct_option_index];
          if (correctOption && studentAns === correctOption.text) scoreTotal += q.points || 1;
        } else if (q.question_type === 'short_answer') {
          const accepted = q.correct_answer?.synonyms || [];
          if (accepted.some((s: string) => s.trim().toLowerCase() === (studentAns || '').trim().toLowerCase())) {
            scoreTotal += q.points || 1;
          }
        }
      });
      const pct = totalPoints > 0 ? Math.round((scoreTotal / totalPoints) * 100) : 0;
      setFinalScore(pct);
      setPassed(pct >= (settings?.pass_percentage ?? 70));
    }

    startTransition(async () => {
      try {
        const res = isModuleScope
          ? await submitModuleQuizAttempt({ courseId, moduleId: moduleId!, answers })
          : await submitQuizAttempt({ courseId, lessonId: quiz.id, answers });

        if (res.error) {
          toast.error(res.error);
          return;
        }
        if ((res as any).pendingReview) {
          setPendingReview(true);
          setPassed(false);
          setIsSubmitted(true);
          toast.success('Answers submitted — an instructor will review your file upload.');
          return;
        }
        setFinalScore(res.score ?? 0);
        setPassed(!!res.passed);
        setIsSubmitted(true);
        toast.success(
          res.passed
            ? 'Congratulations! You passed the quiz.'
            : 'Attempt recorded. Please review the material and try again.'
        );
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
              pendingReview
                ? 'bg-amber-50 text-amber-600 ring-amber-500/15'
                : passed
                ? 'bg-emerald-50 text-emerald-600 ring-emerald-500/15'
                : 'bg-rose-50 text-rose-600 ring-rose-500/15'
            }`}
          >
            {pendingReview ? <Clock3 size={26} /> : passed ? <Award size={26} /> : <XCircle size={26} />}
          </div>
          <div className="space-y-1">
            <span className={`${eyebrow} block`}>Assessment result</span>
            <h2 className="font-display text-[20px] font-semibold !text-dash-text">
              {pendingReview
                ? 'Submitted — awaiting review'
                : passed
                ? 'Assessment passed'
                : 'Assessment not passed'}
            </h2>
            <p className="text-[12px] !text-dash-textMuted">
              {pendingReview
                ? 'This quiz includes a file upload. Your instructor will grade it and your result will appear in My Results.'
                : `Passing threshold: ${settings?.pass_percentage ?? 70}%`}
            </p>
          </div>
        </div>

        {!pendingReview && (
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
        )}

        <div className="space-y-3">
          <h3 className="border-b border-dash-border pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] !text-dash-textMuted">
            Your answers
          </h3>
          <div className="max-h-[34vh] space-y-3 overflow-y-auto pr-1">
            {questions.map((q, idx) => {
              const studentAns = answers[q.id];
              const previewable = CLIENT_PREVIEWABLE.has(q.question_type);
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
                    Q{idx + 1} · {q.question_type.replace(/_/g, ' ')}
                  </span>
                  <p className="text-[13px] font-semibold !text-dash-text">{q.question_text}</p>
                  <div className="space-y-1 text-[12px]">
                    <p className="!text-dash-textMuted">
                      Your answer:{' '}
                      <strong className={previewable ? (isCorrect ? 'text-emerald-600' : 'text-rose-600') : '!text-dash-text'}>
                        {renderAnswerSummary(q, studentAns)}
                      </strong>
                    </p>
                    {previewable && !isCorrect && (
                      <p className="text-emerald-600">
                        Correct answer:{' '}
                        <strong>
                          {q.question_type === 'short_answer'
                            ? (q.correct_answer?.synonyms || []).join(', ')
                            : q.options?.[q.correct_answer?.correct_option_index]?.text || 'No answer set'}
                        </strong>
                      </p>
                    )}
                    {!previewable && (
                      <p className="!text-dash-textMuted italic">
                        {q.question_type === 'file_upload'
                          ? 'Graded by your instructor.'
                          : 'Scored on submission — see your score above.'}
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
          {!passed && !pendingReview && !isModuleScope && (
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

      {hasFileUploadQuestion && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-[11.5px] leading-relaxed text-amber-800">
          <Clock3 size={14} className="mt-0.5 shrink-0" />
          <span>
            This quiz includes a file-upload question. Your submission won&apos;t be scored instantly — an
            instructor reviews the uploaded file and your result appears afterwards in My Results.
          </span>
        </div>
      )}

      {/* Question */}
      <div className="space-y-3 rounded-xl border border-dash-border bg-dash-surface/50 p-4">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-600">
          {activeQuestion.question_type.replace(/_/g, ' ')}
        </span>
        <h3 className="text-[14px] font-semibold leading-relaxed !text-dash-text">
          {activeQuestion.question_text}
        </h3>
        {activeQuestion.question_type === 'fill_blank' && (
          <p className="text-[11px] !text-dash-textMuted">Fill in every blank below.</p>
        )}
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
                    onChange={() => setAnswer(activeQuestion.id, opt.text)}
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
            <span className={fieldLabel}>Type your response</span>
            <input
              type="text"
              value={answers[activeQuestion.id] || ''}
              onChange={(e) => setAnswer(activeQuestion.id, e.target.value)}
              placeholder="Your answer"
              className={textInput}
            />
          </div>
        )}

        {activeQuestion.question_type === 'matching' && (
          <MatchingAnswer
            question={activeQuestion}
            value={answers[activeQuestion.id] || {}}
            onChange={(v) => setAnswer(activeQuestion.id, v)}
          />
        )}

        {activeQuestion.question_type === 'ordering' && (
          <OrderingAnswer
            question={activeQuestion}
            value={answers[activeQuestion.id] || activeQuestion.presentation?.items || []}
            onChange={(v) => setAnswer(activeQuestion.id, v)}
          />
        )}

        {activeQuestion.question_type === 'fill_blank' && (
          <FillBlankAnswer
            question={activeQuestion}
            value={answers[activeQuestion.id] || []}
            onChange={(v) => setAnswer(activeQuestion.id, v)}
          />
        )}

        {activeQuestion.question_type === 'code' && (
          <div className="space-y-1.5">
            <span className={fieldLabel}>Write your solution</span>
            <textarea
              value={answers[activeQuestion.id] ?? activeQuestion.presentation?.starter_template ?? ''}
              onChange={(e) => setAnswer(activeQuestion.id, e.target.value)}
              rows={10}
              spellCheck={false}
              className={`${textInput} font-mono text-[12.5px] leading-relaxed`}
            />
            <p className="text-[10.5px] !text-dash-textMuted">
              Your code is checked against the instructor&apos;s accepted solution(s) — formatting and
              indentation don&apos;t matter, but it is not run.
            </p>
          </div>
        )}

        {activeQuestion.question_type === 'file_upload' && (
          <FileUploadAnswer
            question={activeQuestion}
            value={answers[activeQuestion.id]}
            uploading={uploadingQid === activeQuestion.id}
            onFile={(file) => handleFileUpload(activeQuestion.id, file)}
          />
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
          <button onClick={handleSubmit} disabled={isPending || !!uploadingQid} className={btnSubmit}>
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

/* ------------------------------------------------------------------ per-type answer inputs */

function MatchingAnswer({
  question,
  value,
  onChange,
}: {
  question: any;
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  const left: string[] = question.presentation?.leftItems || [];
  const right: string[] = question.presentation?.rightItems || [];
  return (
    <div className="space-y-2.5">
      <span className={fieldLabel}>Match each item on the left to one on the right</span>
      {left.map((l, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-dash-border bg-white p-3">
          <span className="min-w-0 flex-1 text-[13px] font-medium !text-dash-text">{l}</span>
          <ChevronRight size={14} className="shrink-0 !text-dash-textMuted" />
          <select
            value={value[l] || ''}
            onChange={(e) => onChange({ ...value, [l]: e.target.value })}
            className="w-1/2 shrink-0 rounded-lg border border-dash-border bg-white px-2.5 py-2 text-[12.5px] !text-dash-text outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/12"
          >
            <option value="">Choose…</option>
            {right.map((r, j) => (
              <option key={j} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

function OrderingAnswer({
  question,
  value,
  onChange,
}: {
  question: any;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const items = value.length ? value : question.presentation?.items || [];
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const next = [...items];
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    onChange(next);
  };
  return (
    <div className="space-y-1.5">
      <span className={fieldLabel}>Drag the items into the correct order</span>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId={`ordering-${question.id}`}>
          {(dropProvided) => (
            <div ref={dropProvided.innerRef} {...dropProvided.droppableProps} className="space-y-2">
              {items.map((item: string, index: number) => (
                <Draggable key={`${item}-${index}`} draggableId={`${item}-${index}`} index={index}>
                  {(dragProvided, snapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      className={`flex items-center gap-3 rounded-xl border bg-white p-3 text-[13px] !text-dash-text transition-colors ${
                        snapshot.isDragging ? 'border-sky-500 shadow-md' : 'border-dash-border'
                      }`}
                    >
                      <GripVertical size={15} className="shrink-0 !text-dash-textMuted" />
                      <span className="w-5 shrink-0 text-[11px] font-semibold !text-dash-textMuted tabular-nums">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">{item}</span>
                    </div>
                  )}
                </Draggable>
              ))}
              {dropProvided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

function FillBlankAnswer({
  question,
  value,
  onChange,
}: {
  question: any;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const text: string = question.presentation?.text_with_blanks || '';
  const segments = text.split('[blank]');
  const blankCount = segments.length - 1;
  const answers = Array.from({ length: blankCount }, (_, i) => value[i] ?? '');
  const setAt = (i: number, v: string) => {
    const next = [...answers];
    next[i] = v;
    onChange(next);
  };
  return (
    <div className="space-y-1.5">
      <span className={fieldLabel}>Complete the sentence</span>
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-2 rounded-xl border border-dash-border bg-white p-4 text-[13px] leading-loose !text-dash-text">
        {segments.map((seg, i) => (
          <React.Fragment key={i}>
            <span>{seg}</span>
            {i < blankCount && (
              <input
                type="text"
                value={answers[i]}
                onChange={(e) => setAt(i, e.target.value)}
                aria-label={`Blank ${i + 1}`}
                className="inline-w-auto min-w-[6rem] max-w-[12rem] rounded-md border-b-2 border-sky-400 bg-sky-50/50 px-2 py-1 text-[12.5px] !text-dash-text outline-none focus:border-sky-600"
              />
            )}
          </React.Fragment>
        ))}
      </p>
    </div>
  );
}

function FileUploadAnswer({
  question,
  value,
  uploading,
  onFile,
}: {
  question: any;
  value: { file_name?: string; file_url?: string } | undefined;
  uploading: boolean;
  onFile: (file: File) => void;
}) {
  const rubric: { criteria: string; max_points: number }[] = question.presentation?.rubric_criteria || [];
  return (
    <div className="space-y-3">
      {rubric.length > 0 && (
        <div className="rounded-xl border border-dash-border bg-dash-surface/50 p-3">
          <span className={fieldLabel}>How this is graded</span>
          <ul className="mt-1.5 space-y-1">
            {rubric.map((r, i) => (
              <li key={i} className="flex justify-between text-[12px] !text-dash-text">
                <span>{r.criteria}</span>
                <span className="!text-dash-textMuted">{r.max_points} pts</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {value?.file_name ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
          <FileText size={16} className="shrink-0 text-emerald-600" />
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium !text-dash-text">
            {value.file_name}
          </span>
          <label className="shrink-0 cursor-pointer text-[11px] font-semibold text-sky-600 hover:underline">
            Replace
            <input
              type="file"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </label>
        </div>
      ) : (
        <label
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-dash-border bg-white p-6 text-center transition-colors hover:border-sky-400 hover:bg-sky-50/40 ${
            uploading ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          {uploading ? (
            <Loader2 size={20} className="animate-spin motion-reduce:animate-none !text-dash-textMuted" />
          ) : (
            <Upload size={20} className="!text-dash-textMuted" />
          )}
          <span className="text-[12.5px] font-semibold !text-dash-text">
            {uploading ? 'Uploading…' : 'Upload your file'}
          </span>
          <span className="text-[10.5px] !text-dash-textMuted">Click to choose a file to submit as your answer</span>
          <input
            type="file"
            className="hidden"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </label>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ review-screen helpers */

function renderAnswerSummary(q: any, ans: any): string {
  if (ans === undefined || ans === null || ans === '') return 'Unanswered';
  switch (q.question_type) {
    case 'matching':
      return Object.entries(ans)
        .map(([l, r]) => `${l} → ${r || '—'}`)
        .join('; ') || 'Unanswered';
    case 'ordering':
      return Array.isArray(ans) ? ans.join(' → ') : 'Unanswered';
    case 'fill_blank':
      return Array.isArray(ans) ? ans.map((a) => a || '—').join(' | ') : 'Unanswered';
    case 'code':
      return String(ans).trim() ? 'Code submitted' : 'Unanswered';
    case 'file_upload':
      return ans?.file_name ? `File: ${ans.file_name}` : 'No file uploaded';
    default:
      return String(ans);
  }
}
