"use client";

import React, { useMemo } from 'react';
import { useAudioTime, useAudioPlayer } from '@/components/lms/AudioPlayerProvider';
import type { AccessibleAccent } from '@/lib/color/accessibleAccent';
import type { Chapter } from './useAudioLessonContent';

interface ChaptersPanelProps {
  chapters: Chapter[];
  accent: AccessibleAccent;
  className?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Own re-render boundary, same highlight language as TranscriptPanel (accent wash on the
// active row) so the two panels read as one shared visual system, not two competing ones.
export default function ChaptersPanel({ chapters, accent, className = '' }: ChaptersPanelProps) {
  const { seek } = useAudioPlayer();
  const { currentTime } = useAudioTime();

  const activeId = useMemo(() => {
    if (chapters.length === 0) return null;
    const ms = currentTime * 1000;
    const hit = chapters.find((c) => ms >= c.start_time_ms && ms < c.end_time_ms);
    return hit?.id ?? null;
  }, [chapters, currentTime]);

  if (chapters.length === 0) return null;

  return (
    <div className={`rounded-2xl border border-dash-border bg-white p-2 ${className}`}>
      <div className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wide !text-dash-textMuted">
        Chapters
      </div>
      <div className="space-y-0.5">
        {chapters.map((c) => {
          const isActive = c.id === activeId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => seek(c.start_time_ms / 1000)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-150 hover:bg-dash-surface motion-reduce:transition-none"
              style={isActive ? { backgroundColor: `${accent.ui}14` } : undefined}
            >
              <span
                className="w-10 shrink-0 text-[11px] font-mono tabular-nums"
                style={{ color: isActive ? accent.text : '#94A3B8' }}
              >
                {formatTime(c.start_time_ms / 1000)}
              </span>
              <span
                className="truncate text-[13px]"
                style={{ color: isActive ? '#0F172A' : '#475569', fontWeight: isActive ? 600 : 500 }}
              >
                {c.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
