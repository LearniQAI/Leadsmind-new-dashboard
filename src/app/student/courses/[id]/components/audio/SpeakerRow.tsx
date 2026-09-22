"use client";

import React, { useMemo } from 'react';
import { useAudioTime } from '@/components/lms/AudioPlayerProvider';
import type { AccessibleAccent } from '@/lib/color/accessibleAccent';
import type { LessonSpeaker, SpeakerSegment } from './useAudioLessonContent';

interface SpeakerRowProps {
  speakers: LessonSpeaker[];
  segments: SpeakerSegment[];
  accent: AccessibleAccent;
}

function speakerLabel(s: LessonSpeaker['speakers']) {
  return s?.display_name || s?.name || 'Speaker';
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

// Isolated re-render boundary (per the brief's explicit performance requirement): this is the
// ONLY component that subscribes to useAudioTime() for the purpose of speaker highlighting — a
// timeupdate tick re-renders this row alone, never the transcript/chapters/header around it.
export default function SpeakerRow({ speakers, segments, accent }: SpeakerRowProps) {
  const { currentTime } = useAudioTime();

  const activeSpeakerId = useMemo(() => {
    if (segments.length === 0) return null;
    const ms = currentTime * 1000;
    // Segments are sequence-ordered and non-overlapping-per-speaker by convention (the admin
    // editor warns on overlap) — a linear scan over a realistically-sized (tens of rows) list
    // is cheap even at tick rate.
    const hit = segments.find((s) => ms >= s.start_time_ms && ms < s.end_time_ms);
    return hit?.speaker_id ?? null;
  }, [segments, currentTime]);

  if (speakers.length === 0) return null;

  const activeSpeaker = speakers.find((s) => s.speaker_id === activeSpeakerId);

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className={`flex items-center ${speakers.length > 1 ? '-space-x-2' : ''}`}>
        {speakers.map((ls) => {
          const isActive = segments.length > 0 ? ls.speaker_id === activeSpeakerId : speakers.length === 1;
          const label = speakerLabel(ls.speakers);
          return (
            <div
              key={ls.speaker_id}
              className="relative transition-transform duration-250 ease-out motion-reduce:transition-none"
              style={{
                transform: isActive && speakers.length > 1 ? 'scale(1.08)' : 'scale(1)',
                zIndex: isActive ? 10 : 1,
              }}
            >
              <div
                className="h-14 w-14 overflow-hidden rounded-full border-[3px] border-white bg-dash-surface shadow-sm transition-[box-shadow,opacity] duration-250 ease-out motion-reduce:transition-none"
                style={{
                  boxShadow: isActive ? `0 0 0 3px ${accent.ui}` : '0 0 0 0 transparent',
                  opacity: segments.length > 0 && !isActive ? 0.55 : 1,
                }}
              >
                {ls.speakers?.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ls.speakers.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[13px] font-bold !text-dash-textMuted">
                    {initials(label)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="h-4 min-w-0 max-w-[220px]">
        {activeSpeaker && segments.length > 0 && (
          <p
            key={activeSpeaker.speaker_id}
            className="truncate text-[12px] font-bold animate-in fade-in duration-200 motion-reduce:animate-none"
            style={{ color: accent.text }}
            aria-live="polite"
          >
            {speakerLabel(activeSpeaker.speakers)} is speaking
          </p>
        )}
      </div>
    </div>
  );
}
