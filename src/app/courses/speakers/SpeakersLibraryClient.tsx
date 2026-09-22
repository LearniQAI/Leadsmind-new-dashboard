'use client';

import React, { useEffect, useState } from 'react';
import { Users, Plus, Trash2, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface Speaker {
  id: string;
  name: string;
  display_name: string | null;
  role: string | null;
  bio: string | null;
  image_url: string | null;
}

const emptyDraft = { name: '', display_name: '', role: '', bio: '', image_url: '' };

// PRD Section 10: the workspace's reusable speaker roster, managed once here and pulled into
// any lesson's Speaker Timeline Editor by reference — never re-entered per lesson.
export default function SpeakersLibraryClient() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(emptyDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/lms/speakers');
      const data = await res.json();
      if (!data.error) setSpeakers(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('pathPrefix', 'lms/speakers');
    try {
      const res = await fetch('/api/lms/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setDraft((prev) => ({ ...prev, image_url: data.url }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!draft.name.trim()) {
      toast.error('Speaker name is required');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/lms/speakers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name.trim(),
          display_name: draft.display_name.trim() || null,
          role: draft.role.trim() || null,
          bio: draft.bio.trim() || null,
          image_url: draft.image_url || null,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setSpeakers((prev) => [...prev, data.data].sort((a, b) => a.name.localeCompare(b.name)));
      setDraft(emptyDraft);
      toast.success('Speaker added');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/lms/speakers/${id}`, { method: 'DELETE' });
    setSpeakers((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="border-b border-dash-border pb-6">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600">
          <Users size={13} /> Speaker Library
        </div>
        <h1 className="mt-1 text-[22px] font-bold !text-dash-text">Your workspace&rsquo;s speaker roster</h1>
        <p className="mt-1 text-[13px] !text-dash-textMuted">
          Create a speaker once, reuse them across any lesson&rsquo;s audio timeline.
        </p>
      </div>

      <div className="rounded-2xl border border-dash-border bg-white p-5">
        <h2 className="mb-3 text-[13px] font-bold !text-dash-text">Add a speaker</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="relative shrink-0">
            <div className="h-16 w-16 overflow-hidden rounded-full border border-dash-border bg-dash-surface">
              {draft.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center !text-dash-textMuted">
                  <Users size={20} />
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isUploading}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <Loader2 size={16} className="animate-spin text-white motion-reduce:animate-none" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-dash-accent text-white">
              <Upload size={10} />
            </div>
          </div>

          <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              placeholder="Full name *"
              className="h-9 rounded-lg border border-dash-border bg-white px-3 text-[12px] !text-dash-text outline-none focus:border-dash-accent"
            />
            <input
              value={draft.display_name}
              onChange={(e) => setDraft((p) => ({ ...p, display_name: e.target.value }))}
              placeholder="Display name (optional)"
              className="h-9 rounded-lg border border-dash-border bg-white px-3 text-[12px] !text-dash-text outline-none focus:border-dash-accent"
            />
            <input
              value={draft.role}
              onChange={(e) => setDraft((p) => ({ ...p, role: e.target.value }))}
              placeholder="Role (e.g. Host, Instructor)"
              className="h-9 rounded-lg border border-dash-border bg-white px-3 text-[12px] !text-dash-text outline-none focus:border-dash-accent"
            />
            <input
              value={draft.bio}
              onChange={(e) => setDraft((p) => ({ ...p, bio: e.target.value }))}
              placeholder="Short bio (optional)"
              className="h-9 rounded-lg border border-dash-border bg-white px-3 text-[12px] !text-dash-text outline-none focus:border-dash-accent"
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={isSaving}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-dash-accent px-4 text-[12px] font-bold text-white disabled:opacity-60"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border border-dash-border bg-dash-surface" />
          ))}
        </div>
      ) : speakers.length === 0 ? (
        <p className="py-8 text-center text-[13px] !text-dash-textMuted">No speakers yet — add one above.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {speakers.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-dash-border bg-white p-3.5">
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-dash-border bg-dash-surface">
                {s.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[12px] font-bold !text-dash-textMuted">
                    {s.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-bold !text-dash-text">{s.display_name || s.name}</p>
                {s.role && <p className="truncate text-[11px] !text-dash-textMuted">{s.role}</p>}
              </div>
              <button
                onClick={() => handleDelete(s.id)}
                className="shrink-0 !text-dash-textMuted hover:text-red"
                aria-label={`Delete ${s.name}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
