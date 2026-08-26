"use client";

import React, { useEffect, useRef, useState } from "react";
import { PlayCircle, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import type { ContentBlock } from "../ContentBlockList";

const PROVIDERS = [
  { value: "youtube", label: "YouTube" },
  { value: "vimeo", label: "Vimeo" },
  { value: "wistia", label: "Wistia" },
  { value: "bunny", label: "Bunny.net" },
  { value: "aws", label: "AWS" }
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface VideoBlockEditorProps {
  block: ContentBlock;
  onChange: (patch: Partial<ContentBlock>) => void;
}

// The representative block-settings panel pattern (Phase E, Step 4): label + field, then a
// "Live preview" section that either shows the real fetched preview + a green confirmation
// banner, or an honest "no live preview for this provider" state — never a faked preview.
export default function VideoBlockEditor({ block, onChange }: VideoBlockEditorProps) {
  const [provider, setProvider] = useState(block.video_provider || "youtube");
  const [urlInput, setUrlInput] = useState(block.file_url || "");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(block.content?.thumbnail_url || null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(block.content?.duration_seconds ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unsupportedReason, setUnsupportedReason] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const providerLabel = PROVIDERS.find((p) => p.value === provider)?.label || provider;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setError(null);
    setUnsupportedReason(null);

    if (!urlInput.trim()) {
      setThumbnailUrl(null);
      setDurationSeconds(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/lms/video-thumbnail?provider=${provider}&url=${encodeURIComponent(urlInput.trim())}`);
        const data = await res.json();
        if (data.unsupported) {
          setUnsupportedReason(data.reason);
          setThumbnailUrl(null);
          setDurationSeconds(null);
        } else if (data.error) {
          setError(data.error);
          setThumbnailUrl(null);
          setDurationSeconds(null);
        } else {
          setThumbnailUrl(data.thumbnailUrl);
          setDurationSeconds(data.durationSeconds ?? null);
          onChange({
            video_provider: provider,
            file_url: data.canonicalUrl || urlInput.trim(),
            content: {
              ...block.content,
              thumbnail_url: data.thumbnailUrl,
              title: data.title,
              duration_seconds: data.durationSeconds ?? null
            }
          });
        }
      } catch {
        setError("Failed to fetch video preview");
        setThumbnailUrl(null);
        setDurationSeconds(null);
      } finally {
        setIsLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlInput, provider]);

  const handleProviderChange = (next: string) => {
    setProvider(next);
    setThumbnailUrl(null);
    setDurationSeconds(null);
    onChange({ video_provider: next });
  };

  const handleUrlBlur = () => {
    // For providers with no live thumbnail API, still persist the link on blur.
    if (unsupportedReason && urlInput.trim()) {
      onChange({ video_provider: provider, file_url: urlInput.trim() });
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold !text-dash-textMuted block">Provider</label>
        <select
          value={provider}
          onChange={(e) => handleProviderChange(e.target.value)}
          className="w-full bg-white border border-dash-border rounded-lg px-3 py-2 text-xs !text-dash-text outline-none focus:border-primary"
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold !text-dash-textMuted block">Video link or ID</label>
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onBlur={handleUrlBlur}
          placeholder="Paste video link or ID..."
          className="w-full bg-white border border-dash-border rounded-lg px-3 py-2 text-xs !text-dash-text outline-none focus:border-primary font-mono"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold !text-dash-textMuted block">Live preview</label>

        {isLoading && (
          <div className="flex items-center gap-2 text-[10px] !text-dash-textMuted py-4 justify-center border border-dash-border rounded-xl bg-dash-surface">
            <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> Fetching live preview...
          </div>
        )}

        {!isLoading && thumbnailUrl && (
          <>
            <div
              className="relative rounded-xl overflow-hidden aspect-video bg-black border border-dash-border bg-cover bg-center"
              style={{ backgroundImage: `url(${thumbnailUrl})` }}
            >
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <span className="h-14 w-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                  <PlayCircle size={30} className="text-dash-accent" />
                </span>
              </div>
              {durationSeconds != null && (
                <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  {formatDuration(durationSeconds)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-green bg-green/10 border border-green/20 rounded-lg px-3 py-2 mt-2">
              <CheckCircle2 size={13} className="shrink-0" /> Fetched from {providerLabel} — this is the video that will play for students
            </div>
          </>
        )}

        {!isLoading && error && (
          <div className="flex items-center gap-1.5 text-[10px] text-red py-2 px-3 bg-red/5 border border-red/20 rounded-lg">
            <AlertCircle size={12} className="shrink-0" /> {error}
          </div>
        )}

        {!isLoading && unsupportedReason && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-600 py-2 bg-amber-50 border border-amber-200 rounded-lg px-3">
            <AlertCircle size={12} className="shrink-0" /> {providerLabel} doesn't support a live preview: {unsupportedReason} The link is still saved.
          </div>
        )}

        {!isLoading && !thumbnailUrl && !error && !unsupportedReason && (
          <div className="text-[10px] !text-dash-textMuted py-4 text-center border border-dashed border-dash-border rounded-xl">
            Paste a link or ID above to fetch a live preview
          </div>
        )}
      </div>
    </div>
  );
}
