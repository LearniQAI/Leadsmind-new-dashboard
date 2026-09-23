'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Mic, Plus, ChevronDown, ChevronUp, Rss, Trash2, AlertTriangle, Globe, Loader2, Calendar, Headphones,
} from 'lucide-react';

const CATEGORIES = [
  'Arts', 'Business', 'Comedy', 'Education', 'Fiction', 'Government', 'History',
  'Health & Fitness', 'Kids & Family', 'Leisure', 'Music', 'News', 'Religion & Spirituality',
  'Science', 'Society & Culture', 'Sports', 'Technology', 'True Crime', 'TV & Film',
];

interface Show {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  artwork_url: string | null;
  owner_name: string;
  owner_email: string;
  category: string;
  explicit: boolean;
  podcast_episodes: { id: string; status: string }[];
}

interface Episode {
  id: string;
  title: string;
  description: string | null;
  episode_number: number | null;
  season_number: number | null;
  slug: string;
  status: 'draft' | 'scheduled' | 'published';
  publish_at: string;
  audio_assets: { id: string; filename: string | null; status: string; duration_seconds: number | null } | null;
}

interface ReadyAsset {
  id: string;
  filename: string | null;
  status: string;
  attachments: { content_block_id: string; lesson: { title: string; courses: { title: string } } }[];
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-dash-surface !text-dash-textMuted border-dash-border' },
  scheduled: { label: 'Scheduled', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  published: { label: 'Published', className: 'bg-green/10 text-green border-green/20' },
};

const emptyShowDraft = { title: '', description: '', artwork_url: '', owner_name: '', owner_email: '', category: CATEGORIES[0], explicit: false };

export default function PodcastAdminClient() {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedShow, setExpandedShow] = useState<string | null>(null);
  const [showFormOpen, setShowFormOpen] = useState(false);
  const [showDraft, setShowDraft] = useState(emptyShowDraft);
  const [savingShow, setSavingShow] = useState(false);

  const loadShows = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/lms/podcast-shows');
      const data = await res.json();
      if (!data.error) setShows(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShows();
  }, []);

  const handleCreateShow = async () => {
    if (!showDraft.title.trim() || !showDraft.owner_name.trim() || !showDraft.owner_email.trim()) {
      toast.error('Title, owner name, and owner email are required.');
      return;
    }
    setSavingShow(true);
    try {
      const res = await fetch('/api/lms/podcast-shows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(showDraft),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setShows((prev) => [{ ...data.data, podcast_episodes: [] }, ...prev]);
      setShowDraft(emptyShowDraft);
      setShowFormOpen(false);
      toast.success('Show created');
    } finally {
      setSavingShow(false);
    }
  };

  const handleDeleteShow = async (id: string) => {
    await fetch(`/api/lms/podcast-shows/${id}`, { method: 'DELETE' });
    setShows((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 border-b border-dash-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600">
            <Mic size={13} /> Podcast
          </div>
          <h1 className="mt-1 text-[22px] font-bold !text-dash-text">Public podcast shows</h1>
          <p className="mt-1 text-[13px] !text-dash-textMuted">
            Shows and episodes here are publicly reachable — no login, syndicated to podcast apps.
          </p>
        </div>
        <button
          onClick={() => setShowFormOpen((v) => !v)}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-dash-accent px-4 text-[12px] font-bold text-white"
        >
          <Plus size={14} /> New show
        </button>
      </div>

      {showFormOpen && (
        <div className="rounded-2xl border border-dash-border bg-white p-5">
          <h2 className="mb-3 text-[13px] font-bold !text-dash-text">New podcast show</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={showDraft.title}
              onChange={(e) => setShowDraft((p) => ({ ...p, title: e.target.value }))}
              placeholder="Show title *"
              className="h-9 rounded-lg border border-dash-border bg-white px-3 text-[12px] !text-dash-text"
            />
            <select
              value={showDraft.category}
              onChange={(e) => setShowDraft((p) => ({ ...p, category: e.target.value }))}
              className="h-9 rounded-lg border border-dash-border bg-white px-3 text-[12px] !text-dash-text"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              value={showDraft.owner_name}
              onChange={(e) => setShowDraft((p) => ({ ...p, owner_name: e.target.value }))}
              placeholder="Owner name * (itunes:owner)"
              className="h-9 rounded-lg border border-dash-border bg-white px-3 text-[12px] !text-dash-text"
            />
            <input
              value={showDraft.owner_email}
              onChange={(e) => setShowDraft((p) => ({ ...p, owner_email: e.target.value }))}
              placeholder="Owner email *"
              className="h-9 rounded-lg border border-dash-border bg-white px-3 text-[12px] !text-dash-text"
            />
            <input
              value={showDraft.artwork_url}
              onChange={(e) => setShowDraft((p) => ({ ...p, artwork_url: e.target.value }))}
              placeholder="Artwork URL (1400x1400+ JPEG/PNG)"
              className="h-9 rounded-lg border border-dash-border bg-white px-3 text-[12px] !text-dash-text sm:col-span-2"
            />
            <textarea
              value={showDraft.description}
              onChange={(e) => setShowDraft((p) => ({ ...p, description: e.target.value }))}
              placeholder="Show description"
              rows={2}
              className="rounded-lg border border-dash-border bg-white px-3 py-2 text-[12px] !text-dash-text sm:col-span-2"
            />
            <label className="flex items-center gap-2 text-[12px] !text-dash-text">
              <input
                type="checkbox"
                checked={showDraft.explicit}
                onChange={(e) => setShowDraft((p) => ({ ...p, explicit: e.target.checked }))}
              />
              Explicit content
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleCreateShow}
              disabled={savingShow}
              className="h-9 rounded-lg bg-dash-accent px-4 text-[12px] font-bold text-white disabled:opacity-50"
            >
              {savingShow ? 'Creating...' : 'Create show'}
            </button>
            <button
              onClick={() => setShowFormOpen(false)}
              className="h-9 rounded-lg border border-dash-border bg-white px-4 text-[12px] font-bold !text-dash-text"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="h-32 animate-pulse rounded-2xl border border-dash-border bg-dash-surface" />
      ) : shows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-dash-border bg-white p-12 text-center">
          <Mic size={28} className="mx-auto mb-3 text-dash-accent" />
          <p className="text-[14px] font-bold !text-dash-text">No podcast shows yet</p>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] !text-dash-textMuted">
            Create a show, then add episodes from an existing course lesson or a fresh Drive link.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {shows.map((show) => (
            <ShowCard
              key={show.id}
              show={show}
              isExpanded={expandedShow === show.id}
              onToggle={() => setExpandedShow((prev) => (prev === show.id ? null : show.id))}
              onDelete={() => handleDeleteShow(show.id)}
              onEpisodeCountChange={(count) =>
                setShows((prev) => prev.map((s) => (s.id === show.id ? { ...s, podcast_episodes: new Array(count).fill({ id: '', status: '' }) } : s)))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ShowCard({
  show, isExpanded, onToggle, onDelete, onEpisodeCountChange,
}: {
  show: Show;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onEpisodeCountChange: (count: number) => void;
}) {
  const publishedCount = show.podcast_episodes.filter((e) => e.status === 'published').length;

  return (
    <div className="rounded-2xl border border-dash-border bg-white">
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left">
        {show.artwork_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={show.artwork_url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-dash-surface text-dash-accent">
            <Mic size={18} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold !text-dash-text">{show.title}</p>
          <p className="text-[11px] !text-dash-textMuted">
            {show.category} &middot; {publishedCount} published &middot; {show.podcast_episodes.length} total
          </p>
        </div>
        <a
          href={`/podcast/${show.slug}/feed.xml`}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 rounded-full border border-dash-border px-2.5 py-1 text-[10px] font-bold !text-dash-textMuted hover:!text-dash-text"
        >
          <Rss size={11} className="text-orange-500" /> Feed
        </a>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete "${show.title}" and all its episodes? This cannot be undone.`)) onDelete();
          }}
          className="!text-dash-textMuted hover:text-red"
        >
          <Trash2 size={14} />
        </button>
        {isExpanded ? <ChevronUp size={16} className="!text-dash-textMuted" /> : <ChevronDown size={16} className="!text-dash-textMuted" />}
      </button>

      {isExpanded && <EpisodeManager show={show} onEpisodeCountChange={onEpisodeCountChange} />}
    </div>
  );
}

function EpisodeManager({ show, onEpisodeCountChange }: { show: Show; onEpisodeCountChange: (count: number) => void }) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [readyAssets, setReadyAssets] = useState<ReadyAsset[]>([]);
  const [source, setSource] = useState<'existing' | 'new'>('existing');
  const [draft, setDraft] = useState({ title: '', description: '', episode_number: '', season_number: '', existing_audio_asset_id: '', share_url: '' });
  const [saving, setSaving] = useState(false);
  const [publishModal, setPublishModal] = useState<Episode | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [epRes, assetRes] = await Promise.all([
        fetch(`/api/lms/podcast-episodes?showId=${show.id}`).then((r) => r.json()),
        fetch('/api/lms/audio-assets').then((r) => r.json()),
      ]);
      if (!epRes.error) {
        setEpisodes(epRes.data || []);
        onEpisodeCountChange((epRes.data || []).length);
      }
      if (!assetRes.error) setReadyAssets((assetRes.data || []).filter((a: ReadyAsset) => a.status === 'ready'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show.id]);

  const handleCreate = async () => {
    if (!draft.title.trim()) {
      toast.error('Episode title is required.');
      return;
    }
    if (source === 'existing' && !draft.existing_audio_asset_id) {
      toast.error('Pick an existing audio asset.');
      return;
    }
    if (source === 'new' && !draft.share_url.trim()) {
      toast.error('Paste a Drive link.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/lms/podcast-episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          podcast_show_id: show.id,
          title: draft.title,
          description: draft.description || null,
          episode_number: draft.episode_number ? Number(draft.episode_number) : null,
          season_number: draft.season_number ? Number(draft.season_number) : null,
          existing_audio_asset_id: source === 'existing' ? draft.existing_audio_asset_id : undefined,
          share_url: source === 'new' ? draft.share_url : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      toast.success('Episode created as a draft — publish it separately when ready.');
      setDraft({ title: '', description: '', episode_number: '', season_number: '', existing_audio_asset_id: '', share_url: '' });
      setFormOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleUnpublish = async (episode: Episode) => {
    const res = await fetch(`/api/lms/podcast-episodes/${episode.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'draft' }),
    });
    const data = await res.json();
    if (data.error) {
      toast.error(data.error);
      return;
    }
    toast.success('Unpublished — no longer publicly reachable.');
    await load();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/lms/podcast-episodes/${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div className="border-t border-dash-border p-4">
      {loading ? (
        <div className="h-16 animate-pulse rounded-xl bg-dash-surface" />
      ) : (
        <div className="space-y-2">
          {episodes.map((ep) => {
            const meta = STATUS_META[ep.status];
            const isLive = ep.status === 'published' && new Date(ep.publish_at).getTime() <= Date.now();
            return (
              <div key={ep.id} className="flex items-center gap-3 rounded-xl border border-dash-border bg-dash-surface px-3 py-2">
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.className}`}>{meta.label}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-bold !text-dash-text">{ep.title}</p>
                  <p className="text-[10.5px] !text-dash-textMuted">
                    {ep.audio_assets?.filename || 'No audio'}
                    {ep.status === 'scheduled' || (ep.status === 'published' && !isLive)
                      ? ` · goes live ${new Date(ep.publish_at).toLocaleString()}`
                      : ''}
                  </p>
                </div>
                {isLive && <EpisodePlayCount episodeId={ep.id} />}
                {ep.status !== 'published' ? (
                  <button
                    onClick={() => setPublishModal(ep)}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-dash-accent px-3 py-1.5 text-[11px] font-bold text-white"
                  >
                    <Globe size={12} /> Publish to Podcast
                  </button>
                ) : (
                  <button
                    onClick={() => handleUnpublish(ep)}
                    className="shrink-0 rounded-lg border border-dash-border bg-white px-3 py-1.5 text-[11px] font-bold !text-dash-text"
                  >
                    Unpublish
                  </button>
                )}
                <button onClick={() => handleDelete(ep.id)} className="shrink-0 !text-dash-textMuted hover:text-red">
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
          {episodes.length === 0 && <p className="py-3 text-center text-[11px] !text-dash-textMuted">No episodes yet.</p>}
        </div>
      )}

      {!formOpen ? (
        <button
          onClick={() => setFormOpen(true)}
          className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-dash-accent hover:underline"
        >
          <Plus size={12} /> Add episode
        </button>
      ) : (
        <div className="mt-3 space-y-2 rounded-xl border border-dash-border bg-white p-3">
          <div className="flex gap-1 rounded-lg bg-dash-surface p-0.5">
            {(['existing', 'new'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSource(s)}
                className={`flex-1 rounded-md py-1.5 text-[10px] font-bold ${source === s ? 'bg-dash-accent text-white' : '!text-dash-textMuted'}`}
              >
                {s === 'existing' ? 'From a course lesson' : 'New Drive link'}
              </button>
            ))}
          </div>

          <input
            value={draft.title}
            onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
            placeholder="Episode title *"
            className="h-9 w-full rounded-lg border border-dash-border bg-white px-3 text-[12px] !text-dash-text"
          />
          <textarea
            value={draft.description}
            onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
            placeholder="Show notes"
            rows={2}
            className="w-full rounded-lg border border-dash-border bg-white px-3 py-2 text-[12px] !text-dash-text"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={draft.season_number}
              onChange={(e) => setDraft((p) => ({ ...p, season_number: e.target.value }))}
              placeholder="Season"
              className="h-9 w-24 rounded-lg border border-dash-border bg-white px-3 text-[12px] !text-dash-text"
            />
            <input
              type="number"
              value={draft.episode_number}
              onChange={(e) => setDraft((p) => ({ ...p, episode_number: e.target.value }))}
              placeholder="Episode #"
              className="h-9 w-24 rounded-lg border border-dash-border bg-white px-3 text-[12px] !text-dash-text"
            />
          </div>

          {source === 'existing' ? (
            <select
              value={draft.existing_audio_asset_id}
              onChange={(e) => setDraft((p) => ({ ...p, existing_audio_asset_id: e.target.value }))}
              className="h-9 w-full rounded-lg border border-dash-border bg-white px-3 text-[12px] !text-dash-text"
            >
              <option value="">Pick a ready audio asset...</option>
              {readyAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.filename} {a.attachments[0] ? `(${a.attachments[0].lesson?.courses?.title} · ${a.attachments[0].lesson?.title})` : ''}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={draft.share_url}
              onChange={(e) => setDraft((p) => ({ ...p, share_url: e.target.value }))}
              placeholder="https://drive.google.com/file/d/.../view"
              className="h-9 w-full rounded-lg border border-dash-border bg-white px-3 font-mono text-[12px] !text-dash-text"
            />
          )}

          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving} className="h-9 rounded-lg bg-dash-accent px-4 text-[12px] font-bold text-white disabled:opacity-50">
              {saving ? 'Creating...' : 'Create as draft'}
            </button>
            <button onClick={() => setFormOpen(false)} className="h-9 rounded-lg border border-dash-border bg-white px-4 text-[12px] font-bold !text-dash-text">
              Cancel
            </button>
          </div>
        </div>
      )}

      {publishModal && (
        <PublishConfirmModal
          episode={publishModal}
          onClose={() => setPublishModal(null)}
          onPublished={async () => {
            setPublishModal(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function PublishConfirmModal({
  episode, onClose, onPublished,
}: {
  episode: Episode;
  onClose: () => void;
  onPublished: () => void;
}) {
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!confirmed) {
      toast.error('Confirm you understand this becomes publicly accessible.');
      return;
    }
    if (scheduleMode === 'later' && !scheduledAt) {
      toast.error('Pick a publish date/time.');
      return;
    }
    setSubmitting(true);
    try {
      const publish_at = scheduleMode === 'later' ? new Date(scheduledAt).toISOString() : new Date().toISOString();
      const res = await fetch(`/api/lms/podcast-episodes/${episode.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published', publish_at }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      toast.success(scheduleMode === 'later' ? 'Scheduled — will go live automatically.' : 'Published — now publicly live.');
      onPublished();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-dash-border bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-center gap-2 text-amber-600">
          <AlertTriangle size={18} />
          <h3 className="text-[15px] font-bold">Publish to Podcast</h3>
        </div>
        <p className="text-[13px] !text-dash-text">
          <strong>{episode.title}</strong> will become publicly playable by anyone with the link, with no login,
          and will appear in the show&rsquo;s public RSS feed for podcast apps and directories to pick up. This is a
          separate, bigger exposure than course access.
        </p>

        <div className="mt-4 flex gap-1 rounded-lg bg-dash-surface p-0.5">
          <button
            onClick={() => setScheduleMode('now')}
            className={`flex-1 rounded-md py-1.5 text-[11px] font-bold ${scheduleMode === 'now' ? 'bg-dash-accent text-white' : '!text-dash-textMuted'}`}
          >
            Publish now
          </button>
          <button
            onClick={() => setScheduleMode('later')}
            className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-bold ${scheduleMode === 'later' ? 'bg-dash-accent text-white' : '!text-dash-textMuted'}`}
          >
            <Calendar size={11} /> Schedule
          </button>
        </div>
        {scheduleMode === 'later' && (
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="mt-2 h-9 w-full rounded-lg border border-dash-border bg-white px-3 text-[12px] !text-dash-text"
          />
        )}

        <label className="mt-4 flex items-start gap-2 text-[12px] !text-dash-text">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
          I understand this makes the episode publicly accessible with no login required.
        </label>

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-dash-accent text-[12px] font-bold text-white disabled:opacity-50"
          >
            {submitting ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <Globe size={13} />}
            {scheduleMode === 'later' ? 'Confirm & schedule' : 'Confirm & publish'}
          </button>
          <button onClick={onClose} className="h-9 rounded-lg border border-dash-border bg-white px-4 text-[12px] font-bold !text-dash-text">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Plain request-volume counts (see the migration's own privacy reasoning) — never labeled as
// "listeners" here, since this table cannot distinguish one listener's repeat requests from
// another's.
function EpisodePlayCount({ episodeId }: { episodeId: string }) {
  const [counts, setCounts] = useState<{ lifetimeTotal: number; last30DaysTotal: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/lms/podcast-episodes/${episodeId}/plays`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && !data.error) setCounts(data.data);
      });
    return () => {
      cancelled = true;
    };
  }, [episodeId]);

  if (!counts) return null;

  return (
    <span
      title={`${counts.lifetimeTotal} lifetime stream requests · ${counts.last30DaysTotal} in the last 30 days`}
      className="flex shrink-0 items-center gap-1 text-[10.5px] font-bold !text-dash-textMuted"
    >
      <Headphones size={11} /> {counts.lifetimeTotal}
    </span>
  );
}
