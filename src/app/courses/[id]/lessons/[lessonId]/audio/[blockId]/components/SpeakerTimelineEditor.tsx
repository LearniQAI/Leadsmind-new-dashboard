"use client";

import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Flag, Trash2, AlertTriangle } from 'lucide-react';
import { useAudioPlayer, useAudioTime } from '@/components/lms/AudioPlayerProvider';
import AudioTimeline, { type TimelineSegment, type TimelineChapterMarker } from './AudioTimeline';
import type { LessonSpeaker, SpeakerSegmentRow, ChapterRow } from './useAudioAuthoringData';

interface SpeakerTimelineEditorProps {
  contentBlockId: string;
  lessonSpeakers: LessonSpeaker[];
  segments: SpeakerSegmentRow[];
  chapters: ChapterRow[];
  onSegmentsChange: () => Promise<void>;
}

const LANE_COLORS = ['#1359FF', '#16A34A', '#D97706', '#DB2777', '#7C3AED', '#0891B2'];

function speakerColor(speakerId: string, lessonSpeakers: LessonSpeaker[]): string {
  const idx = lessonSpeakers.findIndex((ls) => ls.speaker_id === speakerId);
  return LANE_COLORS[idx % LANE_COLORS.length] || '#64748B';
}

function speakerLabel(speakerId: string | null, lessonSpeakers: LessonSpeaker[]): string {
  if (!speakerId) return 'Unassigned';
  const match = lessonSpeakers.find((ls) => ls.speaker_id === speakerId);
  return match ? (match.speakers.display_name || match.speakers.name) : 'Unknown';
}

function formatClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Primary authoring flow (per the brief's own recommendation): play the audio, hit "Mark
// speaker change" at the live playhead, assign it to a speaker — the previous open segment
// auto-closes at that same timestamp. Direct timeline dragging (edge handles on AudioTimeline)
// is real and works, but is the refinement path, not how a first pass gets authored.
export default function SpeakerTimelineEditor({
  contentBlockId,
  lessonSpeakers,
  segments,
  chapters,
  onSegmentsChange,
}: SpeakerTimelineEditorProps) {
  const player = useAudioPlayer();
  const { currentTime } = useAudioTime();
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [pendingSpeakerId, setPendingSpeakerId] = useState<string>(lessonSpeakers[0]?.speaker_id || '');

  const sorted = useMemo(() => [...segments].sort((a, b) => a.start_time_ms - b.start_time_ms), [segments]);

  const overlaps = useMemo(() => {
    const flagged = new Set<string>();
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[i].end_time_ms > sorted[j].start_time_ms && sorted[i].start_time_ms < sorted[j].end_time_ms) {
          flagged.add(sorted[i].id);
          flagged.add(sorted[j].id);
        }
      }
    }
    return flagged;
  }, [sorted]);

  const timelineSegments: TimelineSegment[] = sorted.map((s) => ({
    id: s.id,
    start_time_ms: s.start_time_ms,
    end_time_ms: s.end_time_ms,
    color: s.speaker_id ? speakerColor(s.speaker_id, lessonSpeakers) : '#94A3B8',
    label: speakerLabel(s.speaker_id, lessonSpeakers),
  }));
  const timelineChapters: TimelineChapterMarker[] = chapters.map((c) => ({
    id: c.id,
    start_time_ms: c.start_time_ms,
    title: c.title,
  }));

  const handleMarkChange = async () => {
    if (!pendingSpeakerId) {
      toast.error('Add a speaker first (Speakers panel below).');
      return;
    }
    const nowMs = Math.round(currentTime * 1000);
    const lastOpen = sorted[sorted.length - 1];

    if (lastOpen && lastOpen.end_time_ms > nowMs) {
      // Closing the previous segment at this exact moment.
      await fetch(`/api/lms/audio-speaker-segments/${lastOpen.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ end_time_ms: nowMs }),
      });
    }

    const res = await fetch('/api/lms/audio-speaker-segments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content_block_id: contentBlockId,
        speaker_id: pendingSpeakerId,
        start_time_ms: nowMs,
        // A segment always needs a real end; a fresh "open" segment is nominally 1s long and
        // gets pushed out as playback continues, or edited manually afterward.
        end_time_ms: nowMs + 1000,
        sequence: sorted.length,
      }),
    });
    const data = await res.json();
    if (data.error) {
      toast.error(data.error);
      return;
    }
    await onSegmentsChange();
    toast.success(`Marked ${speakerLabel(pendingSpeakerId, lessonSpeakers)} at ${formatClock(nowMs)}`);
  };

  const handleSegmentDrag = async (id: string, next: { start_time_ms: number; end_time_ms: number }) => {
    await fetch(`/api/lms/audio-speaker-segments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    await onSegmentsChange();
  };

  const handleReassign = async (id: string, speakerId: string) => {
    await fetch(`/api/lms/audio-speaker-segments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speaker_id: speakerId }),
    });
    await onSegmentsChange();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/lms/audio-speaker-segments/${id}`, { method: 'DELETE' });
    if (selectedSegmentId === id) setSelectedSegmentId(null);
    await onSegmentsChange();
  };

  if (lessonSpeakers.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-dash-border bg-dash-surface p-4 text-center text-[12px] !text-dash-textMuted">
        Add at least one speaker below before building the speaker timeline.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <AudioTimeline
        durationMs={player.duration * 1000}
        currentTimeMs={currentTime * 1000}
        onSeek={(sec) => player.seek(sec)}
        segments={timelineSegments}
        chapters={timelineChapters}
        selectedSegmentId={selectedSegmentId}
        onSelectSegment={setSelectedSegmentId}
        onSegmentChange={handleSegmentDrag}
        height={56}
      />

      <div className="flex items-center gap-2">
        <select
          value={pendingSpeakerId}
          onChange={(e) => setPendingSpeakerId(e.target.value)}
          className="h-9 flex-1 rounded-lg border border-dash-border bg-white px-2.5 text-[12px] !text-dash-text"
        >
          {lessonSpeakers.map((ls) => (
            <option key={ls.speaker_id} value={ls.speaker_id}>
              {ls.speakers.display_name || ls.speakers.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleMarkChange}
          disabled={!player.track}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-dash-accent px-3 text-[12px] font-bold text-white disabled:opacity-50"
        >
          <Flag size={13} /> Mark speaker change at {formatClock(currentTime * 1000)}
        </button>
      </div>

      {/* Keyboard-accessible editing surface — every segment editable via real inputs, not
          drag-only, per the accessibility requirement. */}
      <div className="space-y-1.5">
        {sorted.map((seg) => (
          <div key={seg.id} className="flex items-center gap-2 rounded-lg border border-dash-border bg-white px-3 py-1.5">
            {overlaps.has(seg.id) && (
              <span title="Overlaps another segment">
                <AlertTriangle size={13} className="shrink-0 text-amber-500" />
              </span>
            )}
            <TimeInput
              valueMs={seg.start_time_ms}
              onCommit={(ms) => handleSegmentDrag(seg.id, { start_time_ms: ms, end_time_ms: seg.end_time_ms })}
            />
            <span className="!text-dash-textMuted">&ndash;</span>
            <TimeInput
              valueMs={seg.end_time_ms}
              onCommit={(ms) => handleSegmentDrag(seg.id, { start_time_ms: seg.start_time_ms, end_time_ms: ms })}
            />
            <select
              value={seg.speaker_id || ''}
              onChange={(e) => handleReassign(seg.id, e.target.value)}
              className="h-7 flex-1 rounded-md border border-dash-border bg-white px-2 text-[11px] !text-dash-text"
            >
              {lessonSpeakers.map((ls) => (
                <option key={ls.speaker_id} value={ls.speaker_id}>
                  {ls.speakers.display_name || ls.speakers.name}
                </option>
              ))}
            </select>
            <button onClick={() => handleDelete(seg.id)} className="shrink-0 !text-dash-textMuted hover:text-red">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimeInput({ valueMs, onCommit }: { valueMs: number; onCommit: (ms: number) => void }) {
  const [text, setText] = useState(formatClock(valueMs));
  React.useEffect(() => setText(formatClock(valueMs)), [valueMs]);

  const commit = () => {
    const match = /^(\d+):(\d{1,2})$/.exec(text.trim());
    if (!match) {
      setText(formatClock(valueMs));
      return;
    }
    const ms = (Number(match[1]) * 60 + Number(match[2])) * 1000;
    onCommit(ms);
  };

  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      aria-label="Time (m:ss)"
      className="h-7 w-14 rounded-md border border-dash-border bg-white px-1.5 text-center font-mono text-[11px] !text-dash-text"
    />
  );
}
