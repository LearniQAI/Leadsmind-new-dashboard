"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { useAudioTime, useAudioPlayer } from '@/components/lms/AudioPlayerProvider';
import { playerEyebrow, playerPanel, playerPrimaryButton, playerRow } from '@/lib/lms/audio/playerStyles';
import type { LessonSpeaker, TranscriptLine } from './useAudioLessonContent';

interface TranscriptPanelProps {
  transcript: TranscriptLine[];
  speakers: LessonSpeaker[];
  /** Inside a mobile accordion: no own panel chrome/heading (the accordion provides both). */
  bare?: boolean;
  /** This player's block is the loaded track (highlighting follows the shared playhead only then). */
  active?: boolean;
  /** Overrides the plain provider seek — the full player passes seek-or-activate. */
  onSeek?: (seconds: number) => void;
}

function speakerName(speakers: LessonSpeaker[], speakerId: string | null): string | null {
  if (!speakerId) return null;
  const match = speakers.find((s) => s.speaker_id === speakerId);
  return match ? (match.speakers?.display_name || match.speakers?.name) : null;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// Own re-render boundary. Auto-scroll follows the active line but yields the moment the user
// scrolls manually (chat-app "new messages" pattern) — a "jump to current" pill reappears the
// affordance rather than fighting them.
export default function TranscriptPanel({ transcript, speakers, bare = false, active = true, onSeek }: TranscriptPanelProps) {
  const { seek: providerSeek } = useAudioPlayer();
  const seek = onSeek ?? providerSeek;
  const snapshot = useAudioTime();
  const currentTime = active ? snapshot.currentTime : -1;
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLButtonElement>(null);
  const isAutoScrollingRef = useRef(false);
  const lastTimeRef = useRef(0);
  const [followActive, setFollowActive] = useState(true);

  const activeIndex = useMemo(() => {
    if (transcript.length === 0) return -1;
    const ms = currentTime * 1000;
    for (let i = transcript.length - 1; i >= 0; i--) {
      if (ms >= transcript[i].start_time_ms) return i;
    }
    return -1;
  }, [transcript, currentTime]);

  // A jump bigger than a normal playback tick means the student scrubbed — re-engage
  // auto-scroll, per the brief's "resume if they scrub" rule.
  useEffect(() => {
    const delta = Math.abs(currentTime - lastTimeRef.current);
    lastTimeRef.current = currentTime;
    if (delta > 1.5) setFollowActive(true);
  }, [currentTime]);

  useEffect(() => {
    if (!followActive || activeIndex < 0) return;
    const el = activeLineRef.current;
    if (!el) return;
    isAutoScrollingRef.current = true;
    el.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    const t = setTimeout(() => {
      isAutoScrollingRef.current = false;
    }, 400);
    return () => clearTimeout(t);
  }, [activeIndex, followActive]);

  const handleScroll = () => {
    if (isAutoScrollingRef.current) return;
    setFollowActive(false);
  };

  if (transcript.length === 0) {
    return (
      <div className={`px-4 py-6 text-center ${bare ? '' : playerPanel}`}>
        <p className="text-[12px] !text-player-textMuted">Transcript not available for this episode.</p>
      </div>
    );
  }

  return (
    <div className={`relative ${bare ? '' : playerPanel}`}>
      {!bare && <div className={`px-5 pb-0 pt-4 ${playerEyebrow}`}>Transcript</div>}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="max-h-[360px] space-y-1 overflow-y-auto p-3"
        role="log"
        aria-label="Transcript"
      >
        {transcript.map((line, i) => {
          const isActive = i === activeIndex;
          const name = speakerName(speakers, line.speaker_id);
          return (
            <button
              key={line.id}
              ref={isActive ? activeLineRef : undefined}
              type="button"
              onClick={() => {
                seek(line.start_time_ms / 1000);
                setFollowActive(true);
              }}
              aria-current={isActive ? 'true' : undefined}
              className={`block px-3.5 py-2.5 ${playerRow} ${isActive ? 'bg-player-raised' : ''}`}
            >
              {isActive && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-gradient-to-b from-player-fillFrom to-player-fillTo" aria-hidden="true" />}
              {name && (
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] !text-player-magentaText">
                  {name}
                </span>
              )}
              <span
                className={`block text-[14px] leading-relaxed ${isActive ? 'font-semibold !text-player-text' : 'font-normal !text-player-textMuted'}`}
              >
                {line.text}
              </span>
            </button>
          );
        })}
      </div>

      {!followActive && (
        // Positioning lives on the wrapper: playerPrimaryButton carries `relative`, which would
        // otherwise override `absolute` on the same element.
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-1 duration-200 motion-reduce:animate-none">
          <button
            type="button"
            onClick={() => setFollowActive(true)}
            className={`gap-1.5 px-3.5 py-1.5 text-[11px] font-bold ${playerPrimaryButton}`}
          >
            <ArrowDown size={12} /> Jump to current
          </button>
        </div>
      )}
    </div>
  );
}
