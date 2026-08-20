'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircleQuestion, X, Send, Loader2, AlertCircle, Clock, History, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

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
    <div className="fixed bottom-6 left-6 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white rounded-full p-4 shadow-2xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 border border-white/10 group"
        >
          <MessageCircleQuestion size={20} className="group-hover:rotate-12 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-wider pr-1 font-space-grotesk">Ask about this course</span>
        </button>
      )}

      {isOpen && (
        <div className="bg-[#080f28]/95 backdrop-blur-md border border-white/5 w-96 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[560px]">
          <div className="bg-[#04091a]/80 px-4 py-3 border-b border-white/5 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-primary" />
              <span className="text-[11px] font-black uppercase tracking-wider text-white">Ask about this course</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <p className="text-[10px] text-white/40 leading-relaxed">
              Answers are grounded only in this course's own lessons. If it's not covered here, you'll be told honestly rather than given a guess.
            </p>

            {historyLoaded && interactions.length === 0 && (
              <p className="text-[11px] text-white/40 text-center py-6">No questions asked yet — try one below.</p>
            )}

            {interactions.map(interaction => (
              <div key={interaction.id} className="bg-white/5 border border-white/5 rounded-xl p-3 space-y-2">
                <p className="text-[12px] font-bold text-white">{interaction.question}</p>
                <p className={`text-[12px] leading-relaxed ${interaction.grounded ? 'text-white/80' : 'text-amber-300/90'}`}>
                  {interaction.answer}
                </p>
                {interaction.grounded && interaction.source_chunks_used.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {Array.from(new Map(interaction.source_chunks_used.map(s => [s.lessonId, s])).values()).map(s => (
                      <button
                        key={s.lessonId}
                        type="button"
                        onClick={() => onJumpToLesson?.(s.lessonId)}
                        className="text-[9px] font-bold uppercase tracking-wide bg-primary/15 text-primary px-2 py-1 rounded-full hover:bg-primary/25 transition-colors"
                        title={s.moduleTitle ? `Module: ${s.moduleTitle}` : undefined}
                      >
                        {s.lessonTitle}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="mx-4 mb-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-[11px] flex items-center gap-2 shrink-0">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleAsk} className="p-3 border-t border-white/5 shrink-0 flex items-center gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={cooldownActive ? `Wait ${cooldownSeconds}s…` : 'Ask a question about this course…'}
              disabled={asking || cooldownActive}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[12px] text-white placeholder-white/30 outline-none focus:border-primary disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={asking || cooldownActive || !question.trim()}
              className="bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl p-2.5 shrink-0"
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
      )}
    </div>
  );
}
