'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, ChevronDown, Loader2, AlertCircle, BookOpenCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load summary');
        return body;
      })
      .then((body) => {
        if (cancelled) return;
        setSummary(body.summary);
        setHasSummarizableContent(body.hasSummarizableContent);
        setLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Something went wrong');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isExpanded, loaded, lessonId]);

  const bulletCount = summary?.summary_bullets?.length ?? 0;

  return (
    <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-dash-border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-dash-surface/50"
      >
        <span className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-500/15">
            <Sparkles className="size-3.5" />
          </span>
          <span className="text-[13px] font-semibold !text-dash-text">Lesson summary</span>
          <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
            AI
          </span>
          {!isExpanded && loaded && bulletCount > 0 && (
            <span className="text-[11px] !text-dash-textMuted">· {bulletCount} key points</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 !text-dash-textMuted transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {isExpanded && (
        <div className="border-t border-dash-border px-5 py-4">
          {loading ? (
            <div className="flex items-center gap-2 py-2 text-[12px] !text-dash-textMuted">
              <Loader2 className="size-4 animate-spin text-sky-500 motion-reduce:animate-none" />
              Generating summary…
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-3 text-[12px] text-rose-700">
              <AlertCircle className="size-4 shrink-0" /> {error}
            </div>
          ) : !hasSummarizableContent ? (
            <div className="flex items-start gap-2.5 text-[12px] leading-relaxed !text-dash-textMuted">
              <BookOpenCheck className="mt-0.5 size-4 shrink-0" />
              This lesson has no text content to summarise.
            </div>
          ) : !summary ? (
            <p className="text-[12px] leading-relaxed !text-dash-textMuted">
              A summary hasn't been generated for this lesson yet — it'll appear here once your
              instructor generates one.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {summary.summary_bullets.map((bullet, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-[13px] leading-relaxed !text-dash-text"
                >
                  <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-sky-500" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
