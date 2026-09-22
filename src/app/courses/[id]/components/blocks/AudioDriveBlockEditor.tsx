"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertTriangle, RefreshCw, Trash2, Plus, X } from "lucide-react";
import type { ContentBlock } from "../ContentBlockList";
import { PropertyGroup } from "@/components/builder/inspector/primitives";

interface AudioDriveBlockEditorProps {
  block: ContentBlock;
  onChange: (patch: Partial<ContentBlock>) => void;
}

type AudioAsset = {
  id: string;
  google_drive_file_id: string;
  share_url: string;
  filename: string | null;
  mime_type: string | null;
  duration_seconds: number | null;
  size_bytes: number | null;
  status: "pending" | "ready" | "broken";
  last_validation_error: string | null;
  last_validated_at: string | null;
};

type Speaker = { id: string; name: string; display_name: string | null; role: string | null };
type LessonSpeaker = { id: string; speaker_id: string; display_order: number; speakers: Speaker };
type Chapter = { id: string; title: string; start_time_ms: number; end_time_ms: number; display_order: number };
type TranscriptSegment = { id: string; speaker_id: string | null; start_time_ms: number; end_time_ms: number; text: string; sequence: number };

function formatMsAsClock(ms: number) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function parseClockToMs(clock: string): number | null {
  const match = /^(\d+):(\d{1,2})$/.exec(clock.trim());
  if (!match) return null;
  const m = Number(match[1]);
  const s = Number(match[2]);
  if (s >= 60) return null;
  return (m * 60 + s) * 1000;
}

// This phase's admin UI is deliberately plain — "just enough to test" ingestion, validation,
// and the speaker/chapter/transcript tables. Full visual player polish is Phase 3.
export default function AudioDriveBlockEditor({ block, onChange }: AudioDriveBlockEditorProps) {
  const assetId: string | undefined = block.content?.audio_asset_id;

  const [shareUrlInput, setShareUrlInput] = useState<string>("");
  const [asset, setAsset] = useState<AudioAsset | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isLoadingAsset, setIsLoadingAsset] = useState(!!assetId);

  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [lessonSpeakers, setLessonSpeakers] = useState<LessonSpeaker[]>([]);
  const [newSpeakerName, setNewSpeakerName] = useState("");

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [newChapter, setNewChapter] = useState({ title: "", start: "", end: "" });

  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [newSegment, setNewSegment] = useState({ start: "", end: "", text: "", speakerId: "" });

  // The asset row lives server-side keyed by content_block_id, not embedded in the block's own
  // content jsonb (see the migration's audio_assets table) — fetch it by the id the last
  // successful validation stashed in content.audio_asset_id.
  useEffect(() => {
    if (!assetId) {
      setIsLoadingAsset(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // There's no GET-by-id route for a single asset yet in this phase — the block's own
        // content_blocks GET already returns everything the editor needs to bootstrap from
        // (content.audio_asset_id), and every asset mutation (validate/recheck) returns the
        // full row directly, so this effect only needs to run once on mount for a
        // previously-saved block. Reuse the recheck endpoint as a read-and-revalidate.
        const res = await fetch(`/api/lms/audio-assets/${assetId}/recheck`, { method: "POST" });
        const data = await res.json();
        if (!cancelled && !data.error) setAsset(data.data);
      } finally {
        if (!cancelled) setIsLoadingAsset(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/lms/speakers`);
      const data = await res.json();
      if (!data.error) setSpeakers(data.data || []);
    })();
  }, []);

  const loadLessonSpeakers = async () => {
    const res = await fetch(`/api/lms/audio-lesson-speakers?contentBlockId=${block.id}`);
    const data = await res.json();
    if (!data.error) setLessonSpeakers(data.data || []);
  };
  const loadChapters = async () => {
    const res = await fetch(`/api/lms/audio-chapters?contentBlockId=${block.id}`);
    const data = await res.json();
    if (!data.error) setChapters(data.data || []);
  };
  const loadTranscript = async () => {
    const res = await fetch(`/api/lms/transcript-segments?contentBlockId=${block.id}`);
    const data = await res.json();
    if (!data.error) setTranscript(data.data || []);
  };

  useEffect(() => {
    loadLessonSpeakers();
    loadChapters();
    loadTranscript();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id]);

  const handleValidate = async () => {
    const trimmed = shareUrlInput.trim();
    if (!trimmed) return;
    setIsValidating(true);
    try {
      const res = await fetch("/api/lms/audio-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_block_id: block.id, share_url: trimmed }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setAsset(data.data);
      if (data.data.status === "ready") {
        onChange({ content: { ...block.content, mode: "drive", audio_asset_id: data.data.id } });
        toast.success("Audio link validated");
      } else {
        toast.error(data.data.last_validation_error || "This link could not be validated.");
      }
    } catch {
      toast.error("Network error validating link");
    } finally {
      setIsValidating(false);
    }
  };

  const handleRecheck = async () => {
    if (!asset) return;
    setIsValidating(true);
    try {
      const res = await fetch(`/api/lms/audio-assets/${asset.id}/recheck`, { method: "POST" });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setAsset(data.data);
      toast[data.data.status === "ready" ? "success" : "error"](
        data.data.status === "ready" ? "Still accessible" : data.data.last_validation_error || "No longer accessible"
      );
    } finally {
      setIsValidating(false);
    }
  };

  const handleAddSpeaker = async () => {
    const name = newSpeakerName.trim();
    if (!name) return;
    const res = await fetch("/api/lms/speakers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.error) {
      toast.error(data.error);
      return;
    }
    setSpeakers((prev) => [...prev, data.data]);
    await attachSpeaker(data.data.id);
    setNewSpeakerName("");
  };

  const attachSpeaker = async (speakerId: string) => {
    const res = await fetch("/api/lms/audio-lesson-speakers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content_block_id: block.id, speaker_id: speakerId, display_order: lessonSpeakers.length }),
    });
    const data = await res.json();
    if (data.error) {
      toast.error(data.error);
      return;
    }
    await loadLessonSpeakers();
  };

  const detachSpeaker = async (linkId: string) => {
    await fetch(`/api/lms/audio-lesson-speakers/${linkId}`, { method: "DELETE" });
    setLessonSpeakers((prev) => prev.filter((s) => s.id !== linkId));
  };

  const attachedSpeakerIds = new Set(lessonSpeakers.map((s) => s.speaker_id));
  const availableSpeakers = speakers.filter((s) => !attachedSpeakerIds.has(s.id));

  const handleAddChapter = async () => {
    const start = parseClockToMs(newChapter.start);
    const end = parseClockToMs(newChapter.end);
    if (!newChapter.title.trim() || start == null || end == null || end <= start) {
      toast.error("Chapter needs a title and valid m:ss start/end (end after start).");
      return;
    }
    const res = await fetch("/api/lms/audio-chapters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content_block_id: block.id,
        title: newChapter.title.trim(),
        start_time_ms: start,
        end_time_ms: end,
        display_order: chapters.length,
      }),
    });
    const data = await res.json();
    if (data.error) {
      toast.error(data.error);
      return;
    }
    setChapters((prev) => [...prev, data.data]);
    setNewChapter({ title: "", start: "", end: "" });
  };

  const deleteChapter = async (id: string) => {
    await fetch(`/api/lms/audio-chapters/${id}`, { method: "DELETE" });
    setChapters((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddSegment = async () => {
    const start = parseClockToMs(newSegment.start);
    const end = parseClockToMs(newSegment.end);
    if (!newSegment.text.trim() || start == null || end == null || end <= start) {
      toast.error("Transcript line needs text and valid m:ss start/end (end after start).");
      return;
    }
    const res = await fetch("/api/lms/transcript-segments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content_block_id: block.id,
        speaker_id: newSegment.speakerId || null,
        start_time_ms: start,
        end_time_ms: end,
        text: newSegment.text.trim(),
        sequence: transcript.length,
      }),
    });
    const data = await res.json();
    if (data.error) {
      toast.error(data.error);
      return;
    }
    setTranscript((prev) => [...prev, data.data]);
    setNewSegment({ start: "", end: "", text: "", speakerId: "" });
  };

  const deleteSegment = async (id: string) => {
    await fetch(`/api/lms/transcript-segments/${id}`, { method: "DELETE" });
    setTranscript((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-5">
      <PropertyGroup title="Google Drive link">
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <input
              type="url"
              value={shareUrlInput}
              onChange={(e) => setShareUrlInput(e.target.value)}
              placeholder="https://drive.google.com/file/d/.../view"
              className="flex-1 bg-white border border-dash-border rounded-lg px-3 py-2 text-xs !text-dash-text outline-none focus:border-primary font-mono"
            />
            <button
              type="button"
              onClick={handleValidate}
              disabled={isValidating || !shareUrlInput.trim()}
              className="shrink-0 h-full bg-dash-accent text-white text-[10px] font-bold px-4 rounded-lg disabled:opacity-50"
            >
              {isValidating ? "Validating..." : "Validate"}
            </button>
          </div>
          <p className="text-[10px] !text-dash-textMuted">
            The file must be shared "Anyone with the link" and be an audio file (mp3, m4a, wav).
          </p>
        </div>

        {isLoadingAsset && (
          <div className="flex items-center gap-2 text-[10px] !text-dash-textMuted py-3">
            <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> Loading saved link...
          </div>
        )}

        {!isLoadingAsset && asset && (
          <div
            className={`mt-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-[11px] font-semibold ${
              asset.status === "ready"
                ? "border-green/20 bg-green/10 text-green"
                : "border-amber-300 bg-amber-50 text-amber-700"
            }`}
          >
            {asset.status === "ready" ? (
              <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-0.5">
              <div>
                {asset.status === "ready"
                  ? `Ready — ${asset.filename || "audio file"}`
                  : asset.last_validation_error || "This link is broken."}
              </div>
              {asset.status === "ready" && (
                <div className="font-normal !text-dash-textMuted">
                  {asset.mime_type} {asset.size_bytes ? `· ${Math.round(asset.size_bytes / 1024 / 1024)} MB` : ""}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleRecheck}
              disabled={isValidating}
              className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold !text-dash-text hover:underline"
            >
              <RefreshCw size={11} className={isValidating ? "animate-spin motion-reduce:animate-none" : ""} /> Recheck
            </button>
          </div>
        )}
      </PropertyGroup>

      <PropertyGroup title="Speakers" defaultOpen={false}>
        <div className="space-y-2">
          {lessonSpeakers.map((ls) => (
            <div key={ls.id} className="flex items-center justify-between gap-2 rounded-lg border border-dash-border bg-white px-3 py-1.5">
              <span className="text-[11px] !text-dash-text">
                {ls.speakers?.display_name || ls.speakers?.name}
                {ls.speakers?.role ? <span className="!text-dash-textMuted"> — {ls.speakers.role}</span> : null}
              </span>
              <button type="button" onClick={() => detachSpeaker(ls.id)} className="!text-dash-textMuted hover:text-red-500">
                <X size={13} />
              </button>
            </div>
          ))}
          {availableSpeakers.length > 0 && (
            <select
              onChange={(e) => {
                if (e.target.value) attachSpeaker(e.target.value);
                e.target.value = "";
              }}
              defaultValue=""
              className="w-full bg-white border border-dash-border rounded-lg px-3 py-2 text-[11px] !text-dash-text"
            >
              <option value="" disabled>
                Add an existing speaker...
              </option>
              {availableSpeakers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name || s.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={newSpeakerName}
              onChange={(e) => setNewSpeakerName(e.target.value)}
              placeholder="New speaker name..."
              className="flex-1 bg-white border border-dash-border rounded-lg px-3 py-2 text-[11px] !text-dash-text outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={handleAddSpeaker}
              className="shrink-0 inline-flex items-center gap-1 bg-dash-surface border border-dash-border hover:bg-dash-border/60 !text-dash-text text-[10px] font-bold px-3 rounded-lg"
            >
              <Plus size={12} /> Add
            </button>
          </div>
        </div>
      </PropertyGroup>

      <PropertyGroup title="Chapters" defaultOpen={false}>
        <div className="space-y-2">
          {chapters.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-dash-border bg-white px-3 py-1.5">
              <span className="text-[11px] !text-dash-text font-mono">
                {formatMsAsClock(c.start_time_ms)}–{formatMsAsClock(c.end_time_ms)}
              </span>
              <span className="flex-1 text-[11px] !text-dash-text truncate">{c.title}</span>
              <button type="button" onClick={() => deleteChapter(c.id)} className="!text-dash-textMuted hover:text-red-500">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <div className="flex gap-1.5">
            <input
              type="text"
              value={newChapter.start}
              onChange={(e) => setNewChapter((p) => ({ ...p, start: e.target.value }))}
              placeholder="0:00"
              className="w-16 bg-white border border-dash-border rounded-lg px-2 py-2 text-[11px] !text-dash-text font-mono outline-none focus:border-primary"
            />
            <input
              type="text"
              value={newChapter.end}
              onChange={(e) => setNewChapter((p) => ({ ...p, end: e.target.value }))}
              placeholder="1:30"
              className="w-16 bg-white border border-dash-border rounded-lg px-2 py-2 text-[11px] !text-dash-text font-mono outline-none focus:border-primary"
            />
            <input
              type="text"
              value={newChapter.title}
              onChange={(e) => setNewChapter((p) => ({ ...p, title: e.target.value }))}
              placeholder="Chapter title"
              className="flex-1 bg-white border border-dash-border rounded-lg px-3 py-2 text-[11px] !text-dash-text outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={handleAddChapter}
              className="shrink-0 inline-flex items-center gap-1 bg-dash-surface border border-dash-border hover:bg-dash-border/60 !text-dash-text text-[10px] font-bold px-3 rounded-lg"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
      </PropertyGroup>

      <PropertyGroup title="Transcript" defaultOpen={false}>
        <div className="space-y-2">
          {transcript.map((t) => (
            <div key={t.id} className="flex items-start justify-between gap-2 rounded-lg border border-dash-border bg-white px-3 py-1.5">
              <span className="text-[10px] !text-dash-textMuted font-mono mt-0.5 shrink-0">{formatMsAsClock(t.start_time_ms)}</span>
              <span className="flex-1 text-[11px] !text-dash-text">{t.text}</span>
              <button type="button" onClick={() => deleteSegment(t.id)} className="!text-dash-textMuted hover:text-red-500 shrink-0">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <div className="space-y-1.5">
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newSegment.start}
                onChange={(e) => setNewSegment((p) => ({ ...p, start: e.target.value }))}
                placeholder="0:00"
                className="w-16 bg-white border border-dash-border rounded-lg px-2 py-2 text-[11px] !text-dash-text font-mono outline-none focus:border-primary"
              />
              <input
                type="text"
                value={newSegment.end}
                onChange={(e) => setNewSegment((p) => ({ ...p, end: e.target.value }))}
                placeholder="0:05"
                className="w-16 bg-white border border-dash-border rounded-lg px-2 py-2 text-[11px] !text-dash-text font-mono outline-none focus:border-primary"
              />
              {lessonSpeakers.length > 0 && (
                <select
                  value={newSegment.speakerId}
                  onChange={(e) => setNewSegment((p) => ({ ...p, speakerId: e.target.value }))}
                  className="flex-1 bg-white border border-dash-border rounded-lg px-2 py-2 text-[11px] !text-dash-text"
                >
                  <option value="">No speaker</option>
                  {lessonSpeakers.map((ls) => (
                    <option key={ls.speaker_id} value={ls.speaker_id}>
                      {ls.speakers?.display_name || ls.speakers?.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex gap-1.5">
              <textarea
                value={newSegment.text}
                onChange={(e) => setNewSegment((p) => ({ ...p, text: e.target.value }))}
                placeholder="Transcript line..."
                rows={2}
                className="flex-1 bg-white border border-dash-border rounded-lg px-3 py-2 text-[11px] !text-dash-text outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleAddSegment}
                className="shrink-0 inline-flex items-center gap-1 bg-dash-surface border border-dash-border hover:bg-dash-border/60 !text-dash-text text-[10px] font-bold px-3 rounded-lg self-start"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        </div>
      </PropertyGroup>
    </div>
  );
}
