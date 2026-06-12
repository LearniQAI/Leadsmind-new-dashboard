'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, CheckSquare, Sparkles, CheckCircle2, XCircle, RotateCw, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface RemedialClientProps {
  course: any;
  lesson: any;
  assignment: any;
}

export default function RemedialClient({ course, lesson, assignment }: RemedialClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<'a' | 'b' | 'c' | 'quiz'>('a');
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const questions = assignment.validation_questions || [];

  const handleSubmitQuiz = () => {
    const answersArray = Array.from({ length: questions.length }).map((_, idx) => answers[idx]);
    if (answersArray.some(ans => ans === undefined)) {
      toast.error("Please answer all validation questions before submitting.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/lms/remedial/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignmentId: assignment.id,
            answers: answersArray
          })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setScore(data.score);
        setPassed(data.passed);
        setCorrectCount(data.correctCount);
        setIsSubmitted(true);

        if (data.passed) {
          toast.success("Validation passed! State saved.");
        } else {
          toast.error(`Score: ${data.score}%. Retake attempts increased. Please review methodologies again.`);
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to submit answers");
      }
    });
  };

  const handleStateRestoration = () => {
    // Redirect absolute parameters: ?restore=true&progress=80&t=150
    // Mock progress calculation or seek to lesson position
    const progress = 100;
    const seekSeconds = 0; // restart
    router.push(`/student/courses/${course.id}?restore=true&progress=${progress}&t=${seekSeconds}`);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary flex items-center gap-1">
            <Sparkles size={11} /> AI remedial session
          </span>
        </div>
        <h1 className="text-3xl font-space-grotesk font-black uppercase tracking-tighter text-white mt-1.5">
          Remedial Path: <span className="text-primary">{lesson.title}</span>
        </h1>
        <p className="text-[11px] text-white/40 uppercase tracking-widest mt-2 leading-relaxed">
          Custom training models constructed in real-time from past attempt failures and CRM industry profiling parameters.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 bg-[#080f28]/60 p-1.5 rounded-2xl gap-1">
        <button
          onClick={() => setActiveTab('a')}
          className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
            activeTab === 'a' ? 'bg-primary text-white' : 'text-white/40 hover:text-white/60'
          }`}
        >
          Instructional Directives
        </button>
        <button
          onClick={() => setActiveTab('b')}
          className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
            activeTab === 'b' ? 'bg-primary text-white' : 'text-white/40 hover:text-white/60'
          }`}
        >
          CRM Case Study
        </button>
        <button
          onClick={() => setActiveTab('c')}
          className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
            activeTab === 'c' ? 'bg-primary text-white' : 'text-white/40 hover:text-white/60'
          }`}
        >
          Visualmetaphor comparison
        </button>
        <button
          onClick={() => setActiveTab('quiz')}
          className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
            activeTab === 'quiz' ? 'bg-primary text-white' : 'text-white/40 hover:text-white/60'
          }`}
        >
          Validation quiz
        </button>
      </div>

      {/* Content panes */}
      <div className="bg-[#080f28]/40 border border-white/5 p-8 rounded-3xl min-h-[300px]">
        {activeTab === 'a' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BookOpen size={16} className="text-primary" /> Direct plain-text instructions
            </h3>
            <div className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap font-body font-normal">
              {assignment.methodology_a_text}
            </div>
            <div className="pt-6 border-t border-white/5 flex justify-end">
              <Button onClick={() => setActiveTab('b')} className="bg-white/5 text-white hover:bg-white/10 text-[10px] uppercase font-black tracking-wider">
                Next: Case Study <ArrowRight size={12} className="ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'b' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <CheckSquare size={16} className="text-primary" /> Industry Sector CRM Case Study
            </h3>
            <div className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap font-body font-normal">
              {assignment.methodology_b_case_study}
            </div>
            <div className="pt-6 border-t border-white/5 flex justify-end gap-2">
              <Button onClick={() => setActiveTab('a')} className="bg-white/5 text-white hover:bg-white/10 text-[10px] uppercase font-black tracking-wider">
                Back
              </Button>
              <Button onClick={() => setActiveTab('c')} className="bg-white/5 text-white hover:bg-white/10 text-[10px] uppercase font-black tracking-wider">
                Next: Metaphor <ArrowRight size={12} className="ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'c' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={16} className="text-primary" /> Concept comparison Metaphors & visual analogies
            </h3>
            <div className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap font-body font-normal">
              {assignment.methodology_c_analogy}
            </div>
            <div className="pt-6 border-t border-white/5 flex justify-end gap-2">
              <Button onClick={() => setActiveTab('b')} className="bg-white/5 text-white hover:bg-white/10 text-[10px] uppercase font-black tracking-wider">
                Back
              </Button>
              <Button onClick={() => setActiveTab('quiz')} className="bg-primary text-white hover:bg-primary/90 text-[10px] uppercase font-black tracking-wider shadow-lg shadow-primary/10">
                Take Validation Quiz <ArrowRight size={12} className="ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="space-y-6">
            {!isSubmitted ? (
              <div className="space-y-6">
                <div className="border-b border-white/5 pb-3">
                  <h3 className="text-base font-bold text-white uppercase tracking-wider">AI validation check</h3>
                  <span className="text-[10px] text-white/40 block mt-0.5">Answer the 5 generated validation questions correctly to restore state.</span>
                </div>

                {questions.map((q: any, qIdx: number) => (
                  <div key={qIdx} className="space-y-3 p-5 rounded-2xl bg-white/[0.01] border border-white/5">
                    <span className="text-[9px] font-bold text-primary uppercase font-mono">Question {qIdx + 1}</span>
                    <p className="text-xs font-bold text-white">{q.questionText}</p>
                    
                    <div className="space-y-2 pt-2">
                      {q.options.map((opt: string, oIdx: number) => (
                        <label
                          key={oIdx}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                            answers[qIdx] === oIdx
                              ? 'bg-primary/10 border-primary text-white font-bold'
                              : 'bg-[#111d47]/20 border-white/5 text-white/60 hover:text-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`rem-q-${qIdx}`}
                            checked={answers[qIdx] === oIdx}
                            onChange={() => setAnswers({ ...answers, [qIdx]: oIdx })}
                            className="accent-primary h-4 w-4 shrink-0"
                          />
                          <span className="text-xs">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex justify-end pt-4 border-t border-white/5">
                  <Button
                    onClick={handleSubmitQuiz}
                    disabled={isPending}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-11 px-8 text-[10px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/10"
                  >
                    Submit validation test
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-8 max-w-lg mx-auto py-8">
                <div className="text-center space-y-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                    passed ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' : 'bg-red-500/10 text-red border border-red/25'
                  }`}>
                    {passed ? <CheckCircle2 size={30} /> : <XCircle size={30} />}
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Validation Outcome</span>
                    <h2 className="text-2xl font-space-grotesk font-black uppercase text-white">
                      {passed ? 'Validation Passed!' : 'Validation Failed'}
                    </h2>
                    <p className="text-xs text-white/40 mt-1">
                      {passed ? 'You have successfully passed validation.' : 'Threshold not met. Please review the methodologies again.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-[#04091a]/40 border border-white/5 p-6 rounded-2xl text-center">
                  <div>
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Correct Answers</span>
                    <span className={`text-3xl font-space-grotesk font-black block mt-1 ${passed ? 'text-emerald-400' : 'text-red'}`}>
                      {correctCount} / 5
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Score</span>
                    <span className={`text-3xl font-space-grotesk font-black block mt-1 ${passed ? 'text-emerald-400' : 'text-red'}`}>
                      {score}%
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-4">
                  {passed ? (
                    <Button
                      onClick={handleStateRestoration}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-11 rounded-xl uppercase tracking-wider text-[10px] font-black shadow-lg shadow-emerald-500/15"
                    >
                      Restore lesson player state
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        setIsSubmitted(false);
                        setAnswers({});
                        setActiveTab('a');
                      }}
                      className="w-full bg-primary hover:bg-primary/95 text-white h-11 rounded-xl uppercase tracking-wider text-[10px] font-black shadow-lg shadow-primary/20"
                    >
                      Retake review training
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
