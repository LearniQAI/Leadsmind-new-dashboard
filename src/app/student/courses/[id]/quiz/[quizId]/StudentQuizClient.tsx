'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, ChevronRight, CheckCircle2, AlertTriangle, ArrowLeft, Loader2, Award, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { submitQuizAttempt } from '@/app/actions/studentProgress';
import { Button } from '@/components/ui/button';

interface StudentQuizClientProps {
  courseId: string;
  quiz: any;
  questions: any[];
  settings: any;
  attemptsCount: number;
  hasPassedRemedial: boolean;
}

export default function StudentQuizClient({ 
  courseId, 
  quiz, 
  questions, 
  settings,
  attemptsCount,
  hasPassedRemedial
}: StudentQuizClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [passed, setPassed] = useState(false);

  const activeQuestion = questions[currentIndex] || null;

  // Submit the quiz. A quick client-side estimate is shown immediately for perceived
  // responsiveness, but it is never sent to the server and never what gets persisted — the
  // server independently recomputes score/pass from the real question/answer data, and that
  // authoritative result (not this local guess) is what's displayed once it returns.
  const handleGradeQuiz = () => {
    let scoreTotal = 0;
    const totalPoints = questions.reduce((acc, q) => acc + (q.points || 1), 0);

    questions.forEach(q => {
      const studentAns = answers[q.id];
      if (q.question_type === 'mcq' || q.question_type === 'true_false') {
        const correctIndex = q.correct_answer?.correct_option_index;
        const correctOption = q.options?.[correctIndex];
        if (correctOption && studentAns === correctOption.text) {
          scoreTotal += (q.points || 1);
        }
      } else if (q.question_type === 'short_answer') {
        const accepted = q.correct_answer?.synonyms || [];
        const isMatch = accepted.some((syn: string) =>
          syn.trim().toLowerCase() === (studentAns || '').trim().toLowerCase()
        );
        if (isMatch) {
          scoreTotal += (q.points || 1);
        }
      }
      // Question types with no live answer UI (matching/ordering/fill_blank/code/file_upload)
      // are not locally estimated here either — the server treats them the same way.
    });

    const scorePercentage = totalPoints > 0 ? Math.round((scoreTotal / totalPoints) * 100) : 0;
    const passThreshold = settings?.pass_percentage ?? 70;
    const isPassed = scorePercentage >= passThreshold;

    // Optimistic local estimate, shown only until the server's authoritative result lands.
    setFinalScore(scorePercentage);
    setPassed(isPassed);

    // Save attempt to DB — only the answers are sent; score/passed are computed server-side.
    startTransition(async () => {
      try {
        const res = await submitQuizAttempt({
          courseId,
          lessonId: quiz.id,
          answers
        });
        if (res.error) toast.error(res.error);
        else {
          // Overwrite the optimistic local estimate with the server's authoritative result.
          setFinalScore(res.score);
          setPassed(res.passed);
          toast.success(res.passed ? "Congratulations! You passed the quiz." : "Attempt recorded. Please review the material and try again.");
          setIsSubmitted(true);
        }
      } catch {
        toast.error("Failed to log quiz results");
      }
    });
  };

  if (questions.length === 0) {
    return (
      <div className="bg-[#080f28] border border-white/5 p-8 rounded-2xl max-w-md mx-auto text-center space-y-4 shadow-xl">
        <AlertTriangle className="text-amber-500 mx-auto" size={32} />
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Empty Assessment</h3>
        <p className="text-xs text-white/50 leading-relaxed">
          This quiz contains no questions yet. Please notify your instructor to publish evaluation modules.
        </p>
        <Button 
          onClick={() => router.push(`/student/courses/${courseId}`)}
          className="w-full bg-white/5 border border-white/5 text-white hover:bg-white/10"
        >
          Back to Course Player
        </Button>
      </div>
    );
  }

  const maxAttempts = settings?.max_attempts || 3;
  const isLocked = attemptsCount >= maxAttempts && !hasPassedRemedial;

  if (isLocked) {
    return (
      <div className="bg-[#080f28] border border-white/5 p-8 rounded-2xl max-w-xl mx-auto text-center space-y-6 shadow-xl">
        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
          <AlertTriangle size={32} />
        </div>
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Lockout Status</span>
          <h2 className="text-2xl font-space-grotesk font-black uppercase text-white tracking-tight">Attempts Exceeded</h2>
          <p className="text-xs text-white/50 leading-relaxed max-w-md mx-auto">
            You have used all {attemptsCount} of your allowed attempts for this assessment. 
            To unlock the quiz, you must complete the AI-powered remedial learning path.
          </p>
        </div>
        
        <div className="pt-2">
          <Button 
            onClick={() => router.push(`/student/courses/${courseId}/remedial?lessonId=${quiz.id}`)}
            className="w-full bg-primary hover:bg-primary/90 text-white h-11 rounded-xl uppercase tracking-wider text-[10px] font-black shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            Start AI Remedial Session 🤖
          </Button>
        </div>
        
        <div className="border-t border-white/5 pt-4">
          <Button 
            onClick={() => router.push(`/student/courses/${courseId}`)}
            className="w-full bg-white/5 border border-white/5 text-white hover:bg-white/10 h-10 rounded-xl uppercase tracking-wider text-[10px] font-black"
          >
            Back to Course Player
          </Button>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="bg-[#080f28] border border-white/5 p-8 rounded-2xl max-w-xl mx-auto space-y-8 shadow-xl">
        {/* Banner */}
        <div className="text-center space-y-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
            passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {passed ? <Award size={30} /> : <XCircle size={30} />}
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Assessment Result</span>
            <h2 className="text-2xl font-space-grotesk font-black uppercase text-white tracking-tight">
              {passed ? "Assessment Passed!" : "Assessment Failed"}
            </h2>
            <p className="text-xs text-white/40 mt-1">
              Passing threshold: {settings?.pass_percentage ?? 70}%
            </p>
          </div>
        </div>

        {/* Scores */}
        <div className="grid grid-cols-2 gap-4 bg-[#04091a]/40 border border-white/5 p-6 rounded-2xl">
          <div className="text-center border-r border-white/5">
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Your Score</span>
            <span className={`text-3xl font-space-grotesk font-black block mt-1 ${
              passed ? 'text-emerald-400' : 'text-red-400'
            }`}>{finalScore}%</span>
          </div>
          <div className="text-center">
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Status</span>
            <span className={`text-3xl font-space-grotesk font-black block mt-1 ${
              passed ? 'text-emerald-400' : 'text-red-400'
            }`}>{passed ? 'PASS' : 'FAIL'}</span>
          </div>
        </div>

        {/* Review Explanations */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-white uppercase tracking-widest block border-b border-white/5 pb-2">
            Assessment Review & Rationales
          </h3>
          <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-1">
            {questions.map((q, idx) => {
              const studentAns = answers[q.id];
              const isCorrectMCQ = (q.question_type === 'mcq' || q.question_type === 'true_false') && 
                q.options?.[q.correct_answer?.correct_option_index]?.text === studentAns;
              const isCorrectSA = q.question_type === 'short_answer' && 
                (q.correct_answer?.synonyms || []).some((s: string) => s.trim().toLowerCase() === (studentAns || '').trim().toLowerCase());
              const isCorrect = isCorrectMCQ || isCorrectSA;

              return (
                <div key={q.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.01] space-y-3">
                  <span className="text-[9px] font-bold text-white/30 block">Q{idx + 1}. {q.question_type.toUpperCase()}</span>
                  <p className="text-xs font-bold text-white">{q.question_text}</p>
                  
                  <div className="text-xs space-y-1.5 pt-1">
                    <p className="text-white/60">
                      Your answer: <strong className={isCorrect ? 'text-emerald-400' : 'text-red-400'}>{studentAns || 'Unanswered'}</strong>
                    </p>
                    {!isCorrect && (
                      <p className="text-emerald-400">
                        Correct answer: <strong>
                          {q.question_type === 'short_answer' 
                            ? (q.correct_answer?.synonyms || []).join(', ')
                            : q.options?.[q.correct_answer?.correct_option_index]?.text || 'No answer set'}
                        </strong>
                      </p>
                    )}
                  </div>

                  {q.explanation && (
                    <div className="bg-[#111d47]/20 border border-white/5 p-3 rounded-lg text-[11px] text-white/70 italic leading-relaxed">
                      <strong>LENA Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {!passed && (
            <Button 
              onClick={() => router.push(`/student/courses/${courseId}/remedial?lessonId=${quiz.id}`)}
              className="w-full bg-primary hover:bg-primary/95 text-white h-11 rounded-xl uppercase tracking-wider text-[10px] font-black shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              Start AI Remedial Session 🤖
            </Button>
          )}
          <Button 
            onClick={() => router.push(`/student/courses/${courseId}`)}
            className={`w-full h-11 rounded-xl uppercase tracking-wider text-[10px] font-black border ${
              passed 
                ? 'bg-primary hover:bg-primary/95 text-white border-primary shadow-lg shadow-primary/20' 
                : 'bg-white/5 border-white/5 text-white hover:bg-white/10'
            }`}
          >
            Back to Course Workspace Player
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#080f28] border border-white/5 p-8 rounded-2xl max-w-xl mx-auto space-y-6 shadow-xl">
      {/* Progress header */}
      <div className="flex justify-between items-center border-b border-white/5 pb-3">
        <div>
          <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Assessment Quiz</span>
          <h2 className="text-sm font-bold text-white mt-0.5">{quiz.title}</h2>
        </div>
        <span className="text-xs font-mono font-bold text-primary">
          Question {currentIndex + 1} of {questions.length}
        </span>
      </div>

      {/* Active Question Panel */}
      <div className="space-y-4 p-4 rounded-xl bg-white/[0.01] border border-white/5">
        <span className="text-[9px] font-bold text-primary block uppercase tracking-wider">
          {activeQuestion.question_type.replace('_', ' ')}
        </span>
        <h3 className="text-sm font-bold text-white leading-relaxed">{activeQuestion.question_text}</h3>
      </div>

      {/* Answer selection */}
      <div className="space-y-3 pt-2">
        {(activeQuestion.question_type === 'mcq' || activeQuestion.question_type === 'true_false') && (
          <div className="space-y-2.5">
            {activeQuestion.options?.map((opt: any, idx: number) => (
              <label 
                key={idx}
                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition-all duration-200 ${
                  answers[activeQuestion.id] === opt.text
                    ? 'bg-primary/10 border-primary text-white font-bold'
                    : 'bg-[#111d47]/20 border-white/5 text-white/60 hover:bg-[#111d47]/40 hover:text-white'
                }`}
              >
                <input
                  type="radio"
                  name={`q-${activeQuestion.id}`}
                  checked={answers[activeQuestion.id] === opt.text}
                  onChange={() => setAnswers({ ...answers, [activeQuestion.id]: opt.text })}
                  className="accent-primary h-4 w-4 shrink-0"
                />
                <span className="text-xs">{opt.text}</span>
              </label>
            ))}
          </div>
        )}

        {activeQuestion.question_type === 'short_answer' && (
          <div className="space-y-2">
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Type your response:</span>
            <input 
              type="text"
              value={answers[activeQuestion.id] || ''}
              onChange={(e) => setAnswers({ ...answers, [activeQuestion.id]: e.target.value })}
              placeholder="e.g. const"
              className="w-full bg-[#111d47] border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white outline-none focus:border-primary placeholder:text-white/20 transition-all font-mono"
            />
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center border-t border-white/5 pt-5 mt-4">
        <Button
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex(currentIndex - 1)}
          className="bg-white/5 border border-white/5 text-white hover:bg-white/10 rounded-xl h-10 text-[10px] font-black uppercase tracking-wider px-5"
        >
          Previous
        </Button>

        {currentIndex < questions.length - 1 ? (
          <Button
            onClick={() => setCurrentIndex(currentIndex + 1)}
            className="bg-primary hover:bg-primary/95 text-white rounded-xl h-10 text-[10px] font-black uppercase tracking-wider px-6 flex items-center gap-1"
          >
            Next Question <ChevronRight size={12} />
          </Button>
        ) : (
          <Button
            onClick={handleGradeQuiz}
            disabled={isPending}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-10 text-[10px] font-black uppercase tracking-wider px-6 shadow-lg shadow-emerald-500/10 flex items-center gap-1.5"
          >
            {isPending ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Submitting...
              </>
            ) : (
              "Submit Assessment"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
