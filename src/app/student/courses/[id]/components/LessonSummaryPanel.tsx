'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, ChevronDown, AlertCircle, BookOpenCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SummaryRow {
  id: string;
  summary_bullets: string[];
  updated_at: string;
}

interface LessonSummaryPanelProps {
  lessonId: string;
}

const ACCENT = '#8b5cf6'; // LENA / AI accent — reused verbatim from LENAContextualSidebar

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function LessonSummaryPanel({ lessonId }: LessonSummaryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryRow | null>(null);
  const [hasSummarizableContent, setHasSummarizableContent] = useState(true);

  // Fetch on mount (not on first expand) so the collapsed teaser can show real content.
  // GET is a cheap read of the cached lesson_summaries row — students never trigger
  // generation (that's an instructor-only, credit-guarded POST).
  useEffect(() => {
    let cancelled = false;
    setIsExpanded(false);
    setLoading(true);
    setError(null);
    setSummary(null);

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
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Something went wrong');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  const bullets = summary?.summary_bullets ?? [];
  const bulletCount = bullets.length;
  const teaser = bullets[0] ?? null;

  // What the expanded body should say, given the current state.
  const bodyState: 'loading' | 'error' | 'no-content' | 'not-generated' | 'ready' = loading
    ? 'loading'
    : error
      ? 'error'
      : !hasSummarizableContent
        ? 'no-content'
        : !summary
          ? 'not-generated'
          : 'ready';

  return (
    <div
      className={cn(
        'mx-auto max-w-2xl overflow-hidden rounded-2xl border transition-shadow',
        'border-violet-200/70 bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/50',
        'shadow-[0_4px_20px_-6px_rgba(139,92,246,0.28)]',
        isExpanded && 'shadow-[0_8px_30px_-8px_rgba(139,92,246,0.35)]'
      )}
    >
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-violet-500/[0.04]"
      >
        {/* Gradient AI badge (LENA icon-badge pattern) */}
        <span
          className={cn(
            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            'bg-gradient-to-br from-violet-600 to-indigo-600 text-violet-100 shadow-sm'
          )}
        >
          <Sparkles className={cn('size-4', loading && 'animate-pulse motion-reduce:animate-none')} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span
              className="text-[10px] font-black uppercase tracking-[0.16em]"
              style={{ color: ACCENT }}
            >
              Lesson AI
            </span>
            <span className="text-[13px] font-bold !text-dash-text">Lesson summary</span>
            {bodyState === 'ready' && (
              <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                {bulletCount} key point{bulletCount === 1 ? '' : 's'}
              </span>
            )}
          </span>

          {/* Real teaser — first takeaway, visible before expanding */}
          <span className="mt-1 block text-[12px] leading-snug !text-dash-textMuted">
            {bodyState === 'loading' ? (
              <span className="inline-block h-3 w-56 max-w-full animate-pulse rounded bg-violet-200/60 align-middle motion-reduce:animate-none" />
            ) : bodyState === 'ready' && teaser ? (
              <span className={cn('block', !isExpanded && 'line-clamp-1')}>{teaser}</span>
            ) : bodyState === 'no-content' ? (
              'No text content in this lesson to summarise.'
            ) : bodyState === 'not-generated' ? (
              "Your instructor hasn't generated a summary for this lesson yet."
            ) : bodyState === 'error' ? (
              'Summary unavailable right now.'
            ) : (
              'AI-written key takeaways for this lesson.'
            )}
          </span>
        </span>

        <ChevronDown
          className={cn(
            'mt-1 size-4 shrink-0 text-violet-400 transition-transform duration-300 motion-reduce:transition-none',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Smooth height + fade expand/collapse (grid-rows trick — no plugin needed) */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              'border-t border-violet-200/60 px-4 py-4 transition-opacity duration-200',
              isExpanded ? 'opacity-100' : 'opacity-0'
            )}
          >
            {bodyState === 'loading' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: ACCENT }}>
                  <Sparkles className="size-3.5 animate-pulse motion-reduce:animate-none" />
                  Loading summary…
                </div>
                {[92, 78, 85].map((w, i) => (
                  <div
                    key={i}
                    className="h-3 animate-pulse rounded bg-violet-200/50 motion-reduce:animate-none"
                    style={{ width: `${w}%` }}
                  />
                ))}
              </div>
            ) : bodyState === 'error' ? (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-3 text-[12px] text-rose-700">
                <AlertCircle className="size-4 shrink-0" /> {error}
              </div>
            ) : bodyState === 'no-content' ? (
              <div className="flex items-start gap-2.5 text-[12px] leading-relaxed !text-dash-textMuted">
                <BookOpenCheck className="mt-0.5 size-4 shrink-0" />
                This lesson has no text content to summarise.
              </div>
            ) : bodyState === 'not-generated' ? (
              <div className="flex items-start gap-2.5 text-[12px] leading-relaxed !text-dash-textMuted">
                <Sparkles className="mt-0.5 size-4 shrink-0" style={{ color: ACCENT }} />
                A summary hasn't been generated for this lesson yet — it'll appear here once your
                instructor generates one.
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className="text-[10px] font-black uppercase tracking-[0.16em]"
                    style={{ color: ACCENT }}
                  >
                    Key takeaways
                  </span>
                  {summary && (
                    <span className="text-[10px] font-medium !text-dash-textMuted">
                      Updated {relativeTime(summary.updated_at)}
                    </span>
                  )}
                </div>
                <ul className="space-y-2.5">
                  {bullets.map((bullet, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-[13px] leading-relaxed !text-dash-text animate-in fade-in slide-in-from-bottom-1 motion-reduce:animate-none"
                      style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'backwards' }}
                    >
                      <span
                        className="mt-[7px] size-1.5 shrink-0 rounded-full"
                        style={{ background: ACCENT }}
                      />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
