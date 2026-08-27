'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, X, Send, Loader2, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { DashEmptyState } from '@/components/dashboard-ui';

const BRAND = '#1359FF';

interface SourceChunk {
  lessonId: string;
  lessonTitle: string;
  moduleId: string;
  moduleTitle: string | null;
  similarity: number;
}

interface QAInteraction {
  id: string;
  question: string;
  answer: string;
  source_chunks_used: SourceChunk[];
  grounded: boolean;
  created_at: string;
}

interface CourseQAWidgetProps {
  courseId: string;
  onJumpToLesson?: (lessonId: string) => void;
}

export default function CourseQAWidget({ courseId, onJumpToLesson }: CourseQAWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);

  const [interactions, setInteractions] = useState<QAInteraction[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    if (isOpen && !historyLoaded) {
      loadHistory();
    }
  }, [isOpen, historyLoaded]);

  useEffect(() => {
    if (cooldownSeconds === null || cooldownSeconds <= 0) return;
    const t = setTimeout(() => setCooldownSeconds(s => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [cooldownSeconds]);

  const loadHistory = async () => {
    try {
      const res = await fetch(`/api/lms/course-qa?courseId=${courseId}&limit=20`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load history');
      setInteractions(body.interactions || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load past questions');
    } finally {
      setHistoryLoaded(true);
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    setError(null);
    try {
      const res = await fetch('/api/lms/course-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, question: question.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        if (res.status === 429 && body.retryAfterSeconds) {
          setCooldownSeconds(body.retryAfterSeconds);
        }
        throw new Error(body.error || 'Failed to get an answer');
      }
      setInteractions(prev => [body, ...prev]);
      setQuestion('');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      toast.error(err.message || 'Failed to get an answer');
    } finally {
      setAsking(false);
    }
  };

  const cooldownActive = cooldownSeconds !== null && cooldownSeconds > 0;

  return (
    <>
      <style>{`
        .course-qa-launcher { animation: course-qa-breathe 3s ease-in-out infinite; }
        .course-qa-launcher:hover,
        .course-qa-launcher:focus-visible {
          animation: none;
          box-shadow: 0 0 28px color-mix(in srgb, var(--qa-brand) 42%, transparent),
            0 10px 24px rgba(15, 23, 42, 0.16);
        }
        @keyframes course-qa-breathe {
          0%, 100% {
            box-shadow: 0 0 14px color-mix(in srgb, var(--qa-brand) 22%, transparent),
              0 8px 18px rgba(15, 23, 42, 0.13);
          }
          50% {
            box-shadow: 0 0 22px color-mix(in srgb, var(--qa-brand) 32%, transparent),
              0 9px 21px rgba(15, 23, 42, 0.14);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .course-qa-launcher { animation: none; }
        }
        .course-qa-modal-logo {
          box-shadow: 0 0 12px color-mix(in srgb, var(--qa-brand) 24%, transparent);
        }
      `}</style>

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Ask about this course"
          title="Ask about this course"
          className="group fixed bottom-[132px] right-5 z-[80] flex h-11 w-11 items-center justify-center rounded-full border border-dash-border bg-white shadow-lg shadow-slate-900/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
        >
          <BookOpen className="h-[18px] w-[18px] transition-transform duration-300 group-hover:rotate-6" style={{ color: BRAND }} />
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-[1999] bg-black/20 backdrop-blur-[5px] animate-fade-in"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-[2000] w-[calc(100vw-3rem)] max-w-sm h-[560px] max-h-[75vh] bg-white border border-dash-border rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 font-dm-sans">
          {/* Header */}
          <div className="p-5 border-b border-dash-border flex items-center justify-between bg-dash-surface shrink-0">
            <div className="flex items-center gap-3">
              <div
                className="course-qa-modal-logo w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border-2 bg-white"
                style={{ '--qa-brand': BRAND, borderColor: BRAND } as React.CSSProperties}
              >
                <BookOpen className="h-5 w-5" style={{ color: BRAND }} />
              </div>
              <div>
                <h3 className="text-sm font-bold !text-dash-text font-space-grotesk">Ask about this course</h3>
                <p className="text-[10px] !text-dash-textMuted font-medium pt-0.5">Grounded in this course's lessons</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-11 h-11 flex items-center justify-center !text-dash-textMuted hover:!text-dash-text bg-dash-border/30 hover:bg-dash-border/50 rounded-xl transition duration-150 min-w-[44px] min-h-[44px]"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-white">
            <p className="text-[11px] !text-dash-textMuted leading-relaxed">
              Answers are grounded only in this course's own lessons. If it's not covered here, you'll be told honestly rather than given a guess.
            </p>

            {historyLoaded && interactions.length === 0 && (
              <DashEmptyState
                icon={BookOpen}
                title="No questions asked yet"
                description="Ask something below and I'll answer using this course's lessons."
                compact
              />
            )}

            {interactions.map(interaction => (
              <div key={interaction.id} className="space-y-3">
                {/* Question bubble (outbound) */}
                <div className="flex justify-end">
                  <div
                    className="max-w-[85%] p-3.5 rounded-2xl rounded-tr-none text-xs sm:text-sm leading-relaxed !text-white"
                    style={{ backgroundColor: BRAND }}
                  >
                    <p className="whitespace-pre-wrap !text-white">{interaction.question}</p>
                  </div>
                </div>

                {/* Answer bubble (inbound) */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] flex flex-col gap-2">
                    <div className="p-3.5 rounded-2xl rounded-tl-none text-xs sm:text-sm leading-relaxed bg-dash-surface border border-dash-border">
                      <p className={`whitespace-pre-wrap ${interaction.grounded ? '!text-dash-text' : '!text-amber-700'}`}>
                        {interaction.answer}
                      </p>
                    </div>
                    {interaction.grounded && interaction.source_chunks_used.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from(new Map(interaction.source_chunks_used.map(s => [s.lessonId, s])).values()).map(s => (
                          <button
                            key={s.lessonId}
                            type="button"
                            onClick={() => onJumpToLesson?.(s.lessonId)}
                            className="text-[9px] font-bold uppercase tracking-wide px-2 py-1 rounded-full transition-colors"
                            style={{ backgroundColor: `${BRAND}1A`, color: BRAND }}
                            title={s.moduleTitle ? `Module: ${s.moduleTitle}` : undefined}
                          >
                            {s.lessonTitle}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="mx-5 mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[11px] flex items-center gap-2 shrink-0">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}

          {/* Pill input */}
          <div className="p-4 border-t border-dash-border bg-white pb-safe shrink-0">
            <form
              onSubmit={handleAsk}
              className="relative flex items-center bg-dash-surface rounded-full p-1.5 focus-within:ring-2 transition duration-200"
              style={{ ['--tw-ring-color' as any]: `${BRAND}33` }}
            >
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={cooldownActive ? `Wait ${cooldownSeconds}s…` : 'Ask a question about this course…'}
                disabled={asking || cooldownActive}
                className="flex-1 bg-transparent px-4 py-3.5 text-xs sm:text-sm !text-dash-text placeholder:!text-dash-textMuted outline-none min-h-[44px] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={asking || cooldownActive || !question.trim()}
                className="w-11 h-11 text-white rounded-full transition duration-150 flex items-center justify-center shrink-0 shadow-sm hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 min-w-[44px]"
                style={{ backgroundColor: BRAND }}
              >
                {asking ? (
                  <Loader2 size={16} className="animate-spin motion-reduce:animate-none" />
                ) : cooldownActive ? (
                  <Clock size={16} />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
