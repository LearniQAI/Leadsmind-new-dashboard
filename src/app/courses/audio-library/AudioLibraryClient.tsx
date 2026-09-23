'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Headphones, RefreshCw, Search, AlertTriangle, Clock3, Loader2, Share2 } from 'lucide-react';
import { toast } from 'sonner';

type AssetStatus = 'pending' | 'ready' | 'broken';

interface AssetAttachment {
  content_block_id: string;
  lesson: {
    id: string;
    title: string;
    course_id: string;
    courses: { id: string; title: string };
  };
}

interface AudioAssetRow {
  id: string;
  filename: string | null;
  mime_type: string | null;
  duration_seconds: number | null;
  size_bytes: number | null;
  status: AssetStatus;
  last_validation_error: string | null;
  created_at: string;
  attachments: AssetAttachment[];
}

const STATUS_META: Record<AssetStatus, { label: string; className: string }> = {
  ready: { label: 'Ready', className: 'bg-green/10 text-green border-green/20' },
  pending: { label: 'Pending', className: 'bg-dash-surface !text-dash-textMuted border-dash-border' },
  broken: { label: 'Broken', className: 'bg-red/10 text-red border-red/20' },
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'ready', label: 'Ready' },
  { id: 'pending', label: 'Pending' },
  { id: 'broken', label: 'Broken' },
] as const;

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '—';
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}

// Screen 1 (Phase 3 Part B): every audio_assets row in the workspace, not scoped to one
// lesson — the entry point before attaching audio to a specific lesson. Real search/filter,
// a real recheck action wired to Phase 1's health-check endpoint, and an honest empty state.
export default function AudioLibraryClient() {
  const [assets, setAssets] = useState<AudioAssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const [query, setQuery] = useState('');
  const [rechecking, setRechecking] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/lms/audio-assets');
      const data = await res.json();
      if (!data.error) setAssets(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      const matchesFilter = filter === 'all' || a.status === filter;
      const matchesQuery =
        !query ||
        (a.filename || '').toLowerCase().includes(query.toLowerCase()) ||
        a.attachments.some(
          (att) =>
            att.lesson?.title?.toLowerCase().includes(query.toLowerCase()) ||
            att.lesson?.courses?.title?.toLowerCase().includes(query.toLowerCase())
        );
      return matchesFilter && matchesQuery;
    });
  }, [assets, filter, query]);

  const handleRecheck = async (asset: AudioAssetRow) => {
    setRechecking(asset.id);
    try {
      const res = await fetch(`/api/lms/audio-assets/${asset.id}/recheck`, { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setAssets((prev) => prev.map((a) => (a.id === asset.id ? { ...a, ...data.data } : a)));
      toast[data.data.status === 'ready' ? 'success' : 'error'](
        data.data.status === 'ready' ? 'Still accessible' : data.data.last_validation_error || 'No longer accessible'
      );
    } finally {
      setRechecking(null);
    }
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 border-b border-dash-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600">
            <Headphones size={13} /> Audio Library
          </div>
          <h1 className="mt-1 text-[22px] font-bold !text-dash-text">Every audio file in this workspace</h1>
          <p className="mt-1 text-[13px] !text-dash-textMuted">
            Paste a Google Drive link on any lesson&rsquo;s audio block to add one — this is where they all end up.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`h-8 rounded-lg px-3 text-[12px] font-bold transition-colors ${
                filter === f.id
                  ? 'bg-dash-accent text-white'
                  : 'border border-dash-border bg-white !text-dash-textMuted hover:!text-dash-text'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 !text-dash-textMuted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by filename, lesson, or course..."
            className="h-9 w-full rounded-lg border border-dash-border bg-white pl-9 pr-3 text-[13px] !text-dash-text outline-none focus:border-dash-accent"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-dash-border bg-dash-surface" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        assets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-dash-border bg-white p-12 text-center">
            <Headphones size={28} className="mx-auto mb-3 text-dash-accent" />
            <p className="text-[14px] font-bold !text-dash-text">No audio files yet</p>
            <p className="mx-auto mt-1.5 max-w-md text-[13px] !text-dash-textMuted">
              Open any lesson, add an Audio block, choose the &ldquo;Drive link&rdquo; tab, and paste a Google
              Drive share link (set to &ldquo;Anyone with the link&rdquo;). It shows up here once validated.
            </p>
          </div>
        ) : (
          <p className="py-16 text-center text-[13px] !text-dash-textMuted">No audio files match your search.</p>
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((asset) => {
            const statusMeta = STATUS_META[asset.status];
            const attachments = asset.attachments || [];
            return (
              <div key={asset.id} className="flex flex-col gap-3 rounded-2xl border border-dash-border bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-dash-surface text-dash-accent">
                    <Headphones size={16} />
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {attachments.length > 1 && (
                      <span
                        title={attachments.map((a) => `${a.lesson?.courses?.title} · ${a.lesson?.title}`).join('\n')}
                        className="flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700"
                      >
                        <Share2 size={10} /> Used in {attachments.length} places
                      </span>
                    )}
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusMeta.className}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold !text-dash-text" title={asset.filename || undefined}>
                    {asset.filename || 'Untitled audio'}
                  </p>
                  {attachments.length === 0 ? (
                    <p className="mt-0.5 text-[11px] !text-dash-textMuted">Unattached</p>
                  ) : attachments.length === 1 ? (
                    <Link
                      href={`/courses/${attachments[0].lesson.course_id}/lessons/${attachments[0].lesson.id}/audio/${attachments[0].content_block_id}`}
                      className="mt-0.5 block truncate text-[11px] font-medium text-dash-accent hover:underline"
                    >
                      {attachments[0].lesson?.courses?.title} &middot; {attachments[0].lesson?.title}
                    </Link>
                  ) : (
                    <div className="mt-0.5 space-y-0.5">
                      {attachments.map((att) => (
                        <Link
                          key={att.content_block_id}
                          href={`/courses/${att.lesson.course_id}/lessons/${att.lesson.id}/audio/${att.content_block_id}`}
                          className="block truncate text-[11px] font-medium text-dash-accent hover:underline"
                        >
                          {att.lesson?.courses?.title} &middot; {att.lesson?.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {asset.status === 'broken' && asset.last_validation_error && (
                  <div className="flex items-start gap-1.5 rounded-lg bg-red/5 px-2.5 py-1.5 text-[10.5px] text-red">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                    <span>{asset.last_validation_error}</span>
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between border-t border-dash-border pt-2.5 text-[11px] !text-dash-textMuted">
                  <span className="flex items-center gap-1">
                    <Clock3 size={11} /> {formatDuration(asset.duration_seconds)} &middot; {formatSize(asset.size_bytes)}
                  </span>
                  {(asset.status === 'broken' || asset.status === 'pending') && (
                    <button
                      onClick={() => handleRecheck(asset)}
                      disabled={rechecking === asset.id}
                      className="flex items-center gap-1 font-bold !text-dash-text hover:text-dash-accent"
                    >
                      {rechecking === asset.id ? (
                        <Loader2 size={11} className="animate-spin motion-reduce:animate-none" />
                      ) : (
                        <RefreshCw size={11} />
                      )}
                      Recheck
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
