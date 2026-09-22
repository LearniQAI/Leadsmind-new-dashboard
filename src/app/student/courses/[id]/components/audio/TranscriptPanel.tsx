"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { useAudioTime, useAudioPlayer } from '@/components/lms/AudioPlayerProvider';
import type { AccessibleAccent } from '@/lib/color/accessibleAccent';
import type { LessonSpeaker, TranscriptLine } from './useAudioLessonContent';

interface TranscriptPanelProps {
  transcript: TranscriptLine[];
  speakers: LessonSpeaker[];
  accent: AccessibleAccent;
  className?: string;
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
export default function TranscriptPanel({ transcript, speakers, accent, className = '' }: TranscriptPanelProps) {
  const { seek } = useAudioPlayer();
  const { currentTime } = useAudioTime();
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
      <div className={`rounded-2xl border border-dash-border bg-dash-surface px-4 py-6 text-center ${className}`}>
        <p className="text-[12px] !text-dash-textMuted">Transcript not available for this episode.</p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-2xl border border-dash-border bg-white ${className}`}>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="max-h-[360px] space-y-0.5 overflow-y-auto p-3"
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
              className="block w-full rounded-lg px-3 py-2 text-left transition-colors duration-150 hover:bg-dash-surface motion-reduce:transition-none"
              style={isActive ? { backgroundColor: `${accent.ui}14` } : undefined}
            >
              {name && (
                <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide" style={{ color: accent.text }}>
                  {name}
                </span>
              )}
              <span
                className="block text-[14px] leading-relaxed"
                style={{ color: isActive ? '#0F172A' : '#475569', fontWeight: isActive ? 600 : 400 }}
              >
                {line.text}
              </span>
            </button>
          );
        })}
      </div>

      {!followActive && (
        <button
          type="button"
          onClick={() => setFollowActive(true)}
          className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-white shadow-lg transition-transform duration-150 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100"
          style={{ backgroundColor: accent.text }}
        >
          <ArrowDown size={12} /> Jump to current
        </button>
      )}
    </div>
  );
}
