"use client";

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Flag, Trash2, ArrowUp, ArrowDown, ClipboardPaste } from 'lucide-react';
import { useAudioPlayer, useAudioTime } from '@/components/lms/AudioPlayerProvider';
import type { LessonSpeaker, TranscriptLineRow } from './useAudioAuthoringData';

interface TranscriptEditorProps {
  contentBlockId: string;
  lessonSpeakers: LessonSpeaker[];
  transcript: TranscriptLineRow[];
  onTranscriptChange: () => Promise<void>;
}

function formatClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Natural authoring flow (per the brief): play, pause at each speaker change, type the line,
// hit "mark and add" at the live playhead, continue. Bulk paste is the fallback for a
// transcript already exported elsewhere (the PRD names NotebookLM specifically) — pasted lines
// get auto-timestamped evenly across the remaining duration rather than forcing manual entry.
export default function TranscriptEditor({
  contentBlockId,
  lessonSpeakers,
  transcript,
  onTranscriptChange,
}: TranscriptEditorProps) {
  const player = useAudioPlayer();
  const { currentTime } = useAudioTime();
  const [draftText, setDraftText] = useState('');
  const [draftSpeakerId, setDraftSpeakerId] = useState<string>('');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const sorted = [...transcript].sort((a, b) => a.sequence - b.sequence);

  const handleMarkAndAdd = async () => {
    if (!draftText.trim()) {
      toast.error('Type the line before marking it.');
      return;
    }
    const nowMs = Math.round(currentTime * 1000);
    const res = await fetch('/api/lms/transcript-segments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content_block_id: contentBlockId,
        speaker_id: draftSpeakerId || null,
        start_time_ms: nowMs,
        end_time_ms: nowMs + 3000,
        text: draftText.trim(),
        sequence: sorted.length,
      }),
    });
    const data = await res.json();
    if (data.error) {
      toast.error(data.error);
      return;
    }
    setDraftText('');
    await onTranscriptChange();
  };

  const handleBulkImport = async () => {
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const durationMs = player.duration * 1000;
    const startFrom = sorted.length > 0 ? sorted[sorted.length - 1].end_time_ms : 0;
    const span = Math.max(1000, durationMs - startFrom);
    const perLine = span / lines.length;

    for (let i = 0; i < lines.length; i++) {
      const start = Math.round(startFrom + perLine * i);
      const end = Math.round(startFrom + perLine * (i + 1));
      // Sequential to preserve ordering — a real transcript import is a one-off action, not a
      // hot path worth the complexity of a batch endpoint.
      // eslint-disable-next-line no-await-in-loop
      await fetch('/api/lms/transcript-segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_block_id: contentBlockId,
          speaker_id: null,
          start_time_ms: start,
          end_time_ms: end,
          text: lines[i],
          sequence: sorted.length + i,
        }),
      });
    }
    setBulkText('');
    setShowBulkImport(false);
    await onTranscriptChange();
    toast.success(`Imported ${lines.length} lines, evenly timestamped — adjust as needed.`);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/lms/transcript-segments/${id}`, { method: 'DELETE' });
    await onTranscriptChange();
  };

  const handleReorder = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sorted.length) return;
    const a = sorted[index];
    const b = sorted[target];
    await Promise.all([
      fetch(`/api/lms/transcript-segments/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence: b.sequence }),
      }),
      fetch(`/api/lms/transcript-segments/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence: a.sequence }),
      }),
    ]);
    await onTranscriptChange();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wide !text-dash-textMuted">
          {sorted.length} line{sorted.length === 1 ? '' : 's'}
        </p>
        <button
          onClick={() => setShowBulkImport((v) => !v)}
          className="flex items-center gap-1 text-[11px] font-bold text-dash-accent hover:underline"
        >
          <ClipboardPaste size={12} /> Bulk paste import
        </button>
      </div>

      {showBulkImport && (
        <div className="space-y-2 rounded-xl border border-dash-border bg-dash-surface p-3">
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={4}
            placeholder="Paste one line per row — evenly timestamped across the remaining duration, adjust after."
            className="w-full rounded-lg border border-dash-border bg-white px-2.5 py-2 text-[12px] !text-dash-text outline-none focus:border-dash-accent"
          />
          <button
            onClick={handleBulkImport}
            disabled={!player.duration}
            className="h-8 rounded-lg bg-dash-accent px-3 text-[11px] font-bold text-white disabled:opacity-50"
          >
            Import lines
          </button>
        </div>
      )}

      <div className="max-h-[260px] space-y-1 overflow-y-auto">
        {sorted.map((line, i) => (
          <div key={line.id} className="flex items-start gap-2 rounded-lg border border-dash-border bg-white px-2.5 py-1.5">
            <button
              onClick={() => player.seek(line.start_time_ms / 1000)}
              className="mt-0.5 shrink-0 font-mono text-[10px] font-bold text-dash-accent hover:underline"
            >
              {formatClock(line.start_time_ms)}
            </button>
            <span className="flex-1 text-[12px] !text-dash-text">{line.text}</span>
            <div className="flex shrink-0 items-center gap-0.5">
              <button onClick={() => handleReorder(i, -1)} disabled={i === 0} className="!text-dash-textMuted disabled:opacity-30">
                <ArrowUp size={12} />
              </button>
              <button onClick={() => handleReorder(i, 1)} disabled={i === sorted.length - 1} className="!text-dash-textMuted disabled:opacity-30">
                <ArrowDown size={12} />
              </button>
              <button onClick={() => handleDelete(line.id)} className="!text-dash-textMuted hover:text-red">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-end gap-2 border-t border-dash-border pt-3">
        {lessonSpeakers.length > 0 && (
          <select
            value={draftSpeakerId}
            onChange={(e) => setDraftSpeakerId(e.target.value)}
            className="h-9 shrink-0 rounded-lg border border-dash-border bg-white px-2 text-[11px] !text-dash-text"
          >
            <option value="">No speaker</option>
            {lessonSpeakers.map((ls) => (
              <option key={ls.speaker_id} value={ls.speaker_id}>
                {ls.speakers.display_name || ls.speakers.name}
              </option>
            ))}
          </select>
        )}
        <textarea
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          rows={1}
          placeholder="Transcript line..."
          className="h-9 flex-1 resize-none rounded-lg border border-dash-border bg-white px-2.5 py-2 text-[12px] !text-dash-text outline-none focus:border-dash-accent"
        />
        <button
          onClick={handleMarkAndAdd}
          disabled={!player.track}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-dash-accent px-3 text-[12px] font-bold text-white disabled:opacity-50"
        >
          <Flag size={13} /> Mark & add
        </button>
      </div>
    </div>
  );
}
