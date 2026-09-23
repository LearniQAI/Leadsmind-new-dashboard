"use client";

import React, { useEffect, useState } from 'react';
import { BarChart3, Headphones, TrendingDown } from 'lucide-react';
import { getAudioBlockAnalytics, type AudioBlockAnalytics } from '@/app/actions/audioAnalytics';

interface AudioAnalyticsPanelProps {
  contentBlockId: string;
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Bucket raw drop-off positions into N evenly-spaced time buckets across the episode's
// duration — a real distribution, not a raw dump of every listener's stop point.
function bucketPositions(positions: number[], durationSeconds: number, bucketCount = 8) {
  const bucketSize = durationSeconds / bucketCount;
  const buckets = new Array(bucketCount).fill(0);
  for (const pos of positions) {
    const idx = Math.min(bucketCount - 1, Math.floor(pos / bucketSize));
    if (idx >= 0) buckets[idx]++;
  }
  return buckets.map((count, i) => ({
    label: `${formatClock(i * bucketSize)}`,
    count,
  }));
}

export default function AudioAnalyticsPanel({ contentBlockId }: AudioAnalyticsPanelProps) {
  const [data, setData] = useState<AudioBlockAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getAudioBlockAnalytics(contentBlockId);
      if (!cancelled && res.data) setData(res.data);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [contentBlockId]);

  if (loading) {
    return <div className="h-32 animate-pulse rounded-2xl border border-dash-border bg-dash-surface" />;
  }

  if (!data || data.totalListeners === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-dash-border bg-dash-surface p-5 text-center">
        <Headphones size={20} className="mx-auto mb-2 !text-dash-textMuted" />
        <p className="text-[12px] !text-dash-textMuted">No listens recorded yet — analytics appear once students start listening.</p>
      </div>
    );
  }

  const buckets =
    data.durationSeconds && data.dropOffPositionsSeconds.length > 0
      ? bucketPositions(data.dropOffPositionsSeconds, data.durationSeconds)
      : [];
  const maxBucketCount = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <div className="space-y-3 rounded-2xl border border-dash-border bg-white p-5">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide !text-dash-textMuted">
        <BarChart3 size={13} /> Listen analytics
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-dash-surface p-3">
          <p className="text-[18px] font-bold !text-dash-text">{data.totalListeners}</p>
          <p className="text-[10px] !text-dash-textMuted">Listeners</p>
        </div>
        <div className="rounded-xl bg-dash-surface p-3">
          <p className="text-[18px] font-bold !text-dash-text">{data.averageListenThroughPercent ?? '—'}%</p>
          <p className="text-[10px] !text-dash-textMuted">Avg. listen-through</p>
        </div>
        <div className="rounded-xl bg-dash-surface p-3">
          <p className="text-[18px] font-bold !text-dash-text">{data.completionRate ?? '—'}%</p>
          <p className="text-[10px] !text-dash-textMuted">Complete (&ge;{data.completionThreshold}%)</p>
        </div>
      </div>

      {buckets.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide !text-dash-textMuted">
            <TrendingDown size={11} /> Drop-off distribution
          </div>
          <div className="flex h-20 items-end gap-1">
            {buckets.map((b, i) => (
              <div key={i} className="group relative flex-1">
                <div
                  className="rounded-t bg-amber-400 transition-all duration-300"
                  style={{ height: `${Math.max(4, (b.count / maxBucketCount) * 80)}px` }}
                  title={`${b.label}: ${b.count} listener${b.count === 1 ? '' : 's'} stopped here`}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[9px] !text-dash-textMuted">
            <span>{buckets[0]?.label}</span>
            <span>{buckets[buckets.length - 1]?.label}</span>
          </div>
        </div>
      )}

      {data.dropOffByChapter.length > 0 && (
        <div>
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide !text-dash-textMuted">Drop-off by chapter</div>
          <div className="space-y-1">
            {data.dropOffByChapter.slice(0, 3).map((c) => (
              <div key={c.chapterTitle} className="flex items-center justify-between text-[12px]">
                <span className="truncate !text-dash-text">{c.chapterTitle}</span>
                <span className="shrink-0 font-mono !text-dash-textMuted">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
