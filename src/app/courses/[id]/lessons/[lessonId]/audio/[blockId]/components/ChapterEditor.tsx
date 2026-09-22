"use client";

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Flag, Trash2 } from 'lucide-react';
import { useAudioPlayer, useAudioTime } from '@/components/lms/AudioPlayerProvider';
import type { ChapterRow } from './useAudioAuthoringData';

interface ChapterEditorProps {
  contentBlockId: string;
  chapters: ChapterRow[];
  onChaptersChange: () => Promise<void>;
}

function formatClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ChapterEditor({ contentBlockId, chapters, onChaptersChange }: ChapterEditorProps) {
  const player = useAudioPlayer();
  const { currentTime, duration } = useAudioTime();
  const [title, setTitle] = useState('');

  const sorted = [...chapters].sort((a, b) => a.start_time_ms - b.start_time_ms);

  const handleMarkAndAdd = async () => {
    if (!title.trim()) {
      toast.error('Give the chapter a title first.');
      return;
    }
    const startMs = Math.round(currentTime * 1000);
    const durationMs = duration * 1000;
    // Extends the previous chapter's implicit end (this one's start) and its own end to either
    // the next chapter's start or the track's end — chapters conventionally cover the whole
    // duration with no gaps.
    const nextChapterStart = sorted.find((c) => c.start_time_ms > startMs)?.start_time_ms;
    const endMs = nextChapterStart ?? Math.max(startMs + 1000, durationMs);

    const res = await fetch('/api/lms/audio-chapters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content_block_id: contentBlockId,
        title: title.trim(),
        start_time_ms: startMs,
        end_time_ms: endMs,
        display_order: sorted.length,
      }),
    });
    const data = await res.json();
    if (data.error) {
      toast.error(data.error);
      return;
    }

    // Close off the PRECEDING chapter at this new chapter's start (if one now runs past it).
    const prev = [...sorted].reverse().find((c) => c.start_time_ms < startMs);
    if (prev && prev.end_time_ms > startMs) {
      await fetch(`/api/lms/audio-chapters/${prev.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ end_time_ms: startMs }),
      });
    }

    setTitle('');
    await onChaptersChange();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/lms/audio-chapters/${id}`, { method: 'DELETE' });
    await onChaptersChange();
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        {sorted.map((c) => (
          <div key={c.id} className="flex items-center gap-2 rounded-lg border border-dash-border bg-white px-2.5 py-1.5">
            <button
              onClick={() => player.seek(c.start_time_ms / 1000)}
              className="shrink-0 font-mono text-[10px] font-bold text-dash-accent hover:underline"
            >
              {formatClock(c.start_time_ms)}
            </button>
            <span className="flex-1 truncate text-[12px] !text-dash-text">{c.title}</span>
            <button onClick={() => handleDelete(c.id)} className="shrink-0 !text-dash-textMuted hover:text-red">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        {sorted.length === 0 && (
          <p className="py-2 text-center text-[11px] !text-dash-textMuted">No chapters yet.</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Chapter title..."
          className="h-9 flex-1 rounded-lg border border-dash-border bg-white px-2.5 text-[12px] !text-dash-text outline-none focus:border-dash-accent"
        />
        <button
          onClick={handleMarkAndAdd}
          disabled={!player.track}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-dash-accent px-3 text-[12px] font-bold text-white disabled:opacity-50"
        >
          <Flag size={13} /> Mark at {formatClock(currentTime * 1000)}
        </button>
      </div>
    </div>
  );
}
