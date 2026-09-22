"use client";

import React, { useCallback, useRef, useState } from 'react';

export interface TimelineSegment {
  id: string;
  start_time_ms: number;
  end_time_ms: number;
  color: string;
  label: string;
}

export interface TimelineChapterMarker {
  id: string;
  start_time_ms: number;
  title: string;
}

interface AudioTimelineProps {
  durationMs: number;
  currentTimeMs: number;
  onSeek: (ms: number) => void;
  segments?: TimelineSegment[];
  chapters?: TimelineChapterMarker[];
  selectedSegmentId?: string | null;
  onSelectSegment?: (id: string) => void;
  onSegmentChange?: (id: string, next: { start_time_ms: number; end_time_ms: number }) => void;
  height?: number;
}

function formatTick(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Phase 3 Part B's highest-risk/most-novel piece, built to stand on its own: a clean,
// duration-proportional ruled timeline (no waveform backdrop — see the phase report's
// feasibility finding: full-file client decode of a Drive-proxied file isn't practical at real
// file sizes) showing chapter markers and speaker segment lanes, with a shared playhead the
// live preview and every editor below stay in sync with.
export default function AudioTimeline({
  durationMs,
  currentTimeMs,
  onSeek,
  segments = [],
  chapters = [],
  selectedSegmentId,
  onSelectSegment,
  onSegmentChange,
  height = 64,
}: AudioTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{ id: string; edge: 'start' | 'end'; ms: number } | null>(null);

  const msFromClientX = useCallback((clientX: number): number => {
    const el = trackRef.current;
    if (!el || durationMs <= 0) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * durationMs;
  }, [durationMs]);

  const pctOf = (ms: number) => (durationMs > 0 ? Math.min(100, Math.max(0, (ms / durationMs) * 100)) : 0);

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragState) return;
    onSeek(msFromClientX(e.clientX) / 1000);
  };

  const startEdgeDrag = (segId: string, edge: 'start' | 'end', initialMs: number) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragState({ id: segId, edge, ms: initialMs });
  };

  const handleEdgeMove = (e: React.PointerEvent) => {
    if (!dragState) return;
    const ms = msFromClientX(e.clientX);
    setDragState((prev) => (prev ? { ...prev, ms } : prev));
  };

  const commitEdgeDrag = (e: React.PointerEvent) => {
    if (!dragState) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    const seg = segments.find((s) => s.id === dragState.id);
    if (seg && onSegmentChange) {
      const next =
        dragState.edge === 'start'
          ? { start_time_ms: Math.min(dragState.ms, seg.end_time_ms - 200), end_time_ms: seg.end_time_ms }
          : { start_time_ms: seg.start_time_ms, end_time_ms: Math.max(dragState.ms, seg.start_time_ms + 200) };
      onSegmentChange(dragState.id, next);
    }
    setDragState(null);
  };

  // Ticks roughly every 10% of duration, min spacing so labels don't collide on long episodes.
  const tickCount = 6;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (durationMs / tickCount) * i);

  return (
    <div className="select-none">
      {/* Ruled ticks */}
      <div className="relative mb-1 h-4 text-[9px] font-mono !text-dash-textMuted">
        {ticks.map((ms, i) => (
          <span key={i} className="absolute -translate-x-1/2" style={{ left: `${pctOf(ms)}%` }}>
            {formatTick(ms)}
          </span>
        ))}
      </div>

      {/* Chapter markers */}
      {chapters.length > 0 && (
        <div className="relative mb-1 h-3">
          {chapters.map((c) => (
            <div
              key={c.id}
              title={c.title}
              className="absolute top-0 h-3 w-0.5 bg-amber-400"
              style={{ left: `${pctOf(c.start_time_ms)}%` }}
            />
          ))}
        </div>
      )}

      {/* Track + segments + playhead */}
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        onPointerMove={handleEdgeMove}
        onPointerUp={commitEdgeDrag}
        className="relative w-full cursor-pointer rounded-lg bg-dash-surface"
        style={{ height }}
      >
        {segments.map((seg) => {
          const isDraggingThis = dragState?.id === seg.id;
          const start = isDraggingThis && dragState.edge === 'start' ? dragState.ms : seg.start_time_ms;
          const end = isDraggingThis && dragState.edge === 'end' ? dragState.ms : seg.end_time_ms;
          const isSelected = seg.id === selectedSegmentId;
          return (
            <div
              key={seg.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectSegment?.(seg.id);
              }}
              className="group absolute top-1.5 bottom-1.5 rounded-md transition-[opacity] duration-150"
              style={{
                left: `${pctOf(start)}%`,
                width: `${Math.max(0.5, pctOf(end) - pctOf(start))}%`,
                backgroundColor: seg.color,
                opacity: isSelected ? 1 : 0.75,
                outline: isSelected ? '2px solid #0F172A' : 'none',
                outlineOffset: 1,
              }}
            >
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center truncate px-1 text-[9px] font-bold text-white">
                {seg.label}
              </span>
              {onSegmentChange && (
                <>
                  <div
                    onPointerDown={startEdgeDrag(seg.id, 'start', seg.start_time_ms)}
                    className="absolute -left-1 top-0 h-full w-3 cursor-ew-resize"
                  />
                  <div
                    onPointerDown={startEdgeDrag(seg.id, 'end', seg.end_time_ms)}
                    className="absolute -right-1 top-0 h-full w-3 cursor-ew-resize"
                  />
                </>
              )}
            </div>
          );
        })}

        <div
          className="pointer-events-none absolute top-0 h-full w-0.5 bg-dash-accent"
          style={{ left: `${pctOf(currentTimeMs)}%` }}
        />
      </div>
    </div>
  );
}
