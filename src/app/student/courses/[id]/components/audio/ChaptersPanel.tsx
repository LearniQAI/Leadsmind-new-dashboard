"use client";

import React, { useMemo } from 'react';
import { useAudioTime, useAudioPlayer } from '@/components/lms/AudioPlayerProvider';
import { playerEyebrow, playerPanel, playerRow } from '@/lib/lms/audio/playerStyles';
import type { Chapter } from './useAudioLessonContent';

interface ChaptersPanelProps {
  chapters: Chapter[];
  /** Inside a mobile accordion: no own panel chrome/heading (the accordion provides both). */
  bare?: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Own re-render boundary, same highlight language as TranscriptPanel (raised tint + gradient
// edge bar on the active row) so the two panels read as one shared visual system.
export default function ChaptersPanel({ chapters, bare = false }: ChaptersPanelProps) {
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
    <div className={bare ? '' : `p-2 ${playerPanel}`}>
      {!bare && <div className={`px-3 pb-1.5 pt-2 ${playerEyebrow}`}>Chapters</div>}
      <div className="space-y-0.5">
        {chapters.map((c) => {
          const isActive = c.id === activeId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => seek(c.start_time_ms / 1000)}
              aria-current={isActive ? 'true' : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 ${playerRow} ${isActive ? 'bg-player-raised' : ''}`}
            >
              {isActive && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-gradient-to-b from-player-fillFrom to-player-fillTo" aria-hidden="true" />}
              <span
                className={`w-10 shrink-0 text-[11px] font-semibold tabular-nums ${isActive ? '!text-player-violetText' : '!text-player-textMuted'}`}
              >
                {formatTime(c.start_time_ms / 1000)}
              </span>
              <span
                className={`truncate text-[13px] ${isActive ? 'font-semibold !text-player-text' : 'font-medium !text-player-textMuted'}`}
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
