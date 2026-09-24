"use client";

import React from 'react';
import { Lock } from 'lucide-react';
import type { ChapterRow, LessonSpeaker, SpeakerSegmentRow, TranscriptLineRow } from './useAudioAuthoringData';

interface LockedAdvancedAuthoringProps {
  lessonSpeakers: LessonSpeaker[];
  segments: SpeakerSegmentRow[];
  chapters: ChapterRow[];
  transcript: TranscriptLineRow[];
}

function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Shown in place of the speakers / timeline / chapters / transcript editors while advanced
// authoring is locked (the form_feature_flags row, see lib/lms/audio/advancedAuthoring.ts).
// Anything the admin already entered is listed as plain, read-only text (no chips with ×, no
// inputs) so existing work is visibly frozen rather than hidden. It still plays for students.
export default function LockedAdvancedAuthoring({ lessonSpeakers, segments, chapters, transcript }: LockedAdvancedAuthoringProps) {
  const hasExisting = lessonSpeakers.length + segments.length + chapters.length + transcript.length > 0;
  const speakerNames = lessonSpeakers.map((ls) => ls.speakers?.display_name || ls.speakers?.name).filter(Boolean);

  return (
    <section className="rounded-2xl border border-dash-border bg-white p-5" aria-labelledby="audio-advanced-locked-heading">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dash-surface">
          <Lock size={14} className="!text-dash-textMuted" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="audio-advanced-locked-heading" className="text-[13px] font-bold !text-dash-text">
              Speakers, chapters &amp; transcript
            </h2>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700">
              Coming soon
            </span>
          </div>
          <p className="mt-0.5 text-[12px] !text-dash-textMuted">
            Speaker highlighting, chapters, and transcripts are coming soon. Check back after launch.
          </p>
        </div>
      </div>

      {hasExisting && (
        <div className="mt-4 rounded-xl border border-dash-border bg-dash-surface px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide !text-dash-textMuted">Already added (read-only)</p>
          <ul className="mt-2 space-y-1.5 text-[12px] !text-dash-text">
            {speakerNames.length > 0 && (
              <li>
                {plural(speakerNames.length, 'speaker')} added: <span className="font-semibold">{speakerNames.join(', ')}</span>
              </li>
            )}
            {segments.length > 0 && <li>{plural(segments.length, 'speaker timeline segment')} marked</li>}
            {chapters.length > 0 && (
              <li>
                {plural(chapters.length, 'chapter')}:{' '}
                {chapters.map((c, i) => (
                  <span key={c.id}>
                    {i > 0 && ', '}
                    <span className="font-semibold">{c.title}</span>{' '}
                    <span className="tabular-nums !text-dash-textMuted">({formatMs(c.start_time_ms)})</span>
                  </span>
                ))}
              </li>
            )}
            {transcript.length > 0 && <li>{plural(transcript.length, 'transcript line')}</li>}
          </ul>
          <p className="mt-2 text-[11px] !text-dash-textMuted">
            Students still see this in the player. It can be edited again once these features launch.
          </p>
        </div>
      )}
    </section>
  );
}
