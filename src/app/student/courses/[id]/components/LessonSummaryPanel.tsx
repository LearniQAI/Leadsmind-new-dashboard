'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Loader2, AlertCircle, BookOpenCheck } from 'lucide-react';

interface SummaryRow {
  id: string;
  summary_bullets: string[];
  updated_at: string;
}

interface LessonSummaryPanelProps {
  lessonId: string;
}

export default function LessonSummaryPanel({ lessonId }: LessonSummaryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryRow | null>(null);
  const [hasSummarizableContent, setHasSummarizableContent] = useState(true);

  useEffect(() => {
    // Reset per-lesson — switching lessons must not show the previous
    // lesson's stale summary while the new one loads.
    setIsExpanded(false);
    setLoaded(false);
    setError(null);
    setSummary(null);
  }, [lessonId]);

  useEffect(() => {
    if (!isExpanded || loaded) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/lms/lesson-summary?lessonId=${lessonId}`)
      .then(async res => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load summary');
        return body;
      })
      .then(body => {
        if (cancelled) return;
        setSummary(body.summary);
        setHasSummarizableContent(body.hasSummarizableContent);
        setLoaded(true);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.message || 'Something went wrong');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isExpanded, loaded, lessonId]);

  return (
    <div className="max-w-2xl mx-auto mt-4 bg-[#080f28] border border-white/5 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left"
      >
        <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-primary">
          <Sparkles className="w-3.5 h-3.5" />
          Lesson summary
          <span className="text-[8px] font-bold normal-case tracking-normal text-white/30 border border-white/10 rounded-full px-1.5 py-0.5">AI-generated</span>
        </span>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
      </button>

      {isExpanded && (
        <div className="px-5 pb-5 border-t border-white/5 pt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-[12px] text-white/40">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> Loading summary…
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-[12px] text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          ) : !hasSummarizableContent ? (
            <div className="flex items-start gap-2 text-[12px] text-white/40">
              <BookOpenCheck className="w-4 h-4 shrink-0 mt-0.5" />
              No summary available for this lesson type — this lesson has no text content to summarize.
            </div>
          ) : !summary ? (
            <p className="text-[12px] text-white/40">A summary hasn't been generated for this lesson yet.</p>
          ) : (
            <ul className="space-y-2">
              {summary.summary_bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] text-white/80 leading-relaxed">
                  <span className="text-primary mt-1 shrink-0">•</span>
                  {bullet}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
