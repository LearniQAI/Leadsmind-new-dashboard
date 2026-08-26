"use client";

import React, { useEffect, useRef, useState } from "react";
import { PlayCircle, AlertCircle, Loader2 } from "lucide-react";
import type { ContentBlock } from "../ContentBlockList";

const PROVIDERS = [
  { value: "youtube", label: "YouTube" },
  { value: "vimeo", label: "Vimeo" },
  { value: "wistia", label: "Wistia" },
  { value: "bunny", label: "Bunny.net" },
  { value: "aws", label: "AWS" }
];

interface VideoBlockEditorProps {
  block: ContentBlock;
  onChange: (patch: Partial<ContentBlock>) => void;
}

export default function VideoBlockEditor({ block, onChange }: VideoBlockEditorProps) {
  const [provider, setProvider] = useState(block.video_provider || "youtube");
  const [urlInput, setUrlInput] = useState(block.file_url || "");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(block.content?.thumbnail_url || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unsupportedReason, setUnsupportedReason] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setError(null);
    setUnsupportedReason(null);

    if (!urlInput.trim()) {
      setThumbnailUrl(null);
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
        } else if (data.error) {
          setError(data.error);
          setThumbnailUrl(null);
        } else {
          setThumbnailUrl(data.thumbnailUrl);
          onChange({
            video_provider: provider,
            file_url: data.canonicalUrl || urlInput.trim(),
            content: { ...block.content, thumbnail_url: data.thumbnailUrl, title: data.title }
          });
        }
      } catch {
        setError("Failed to fetch video preview");
        setThumbnailUrl(null);
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
      <div className="flex gap-2">
        <select
          value={provider}
          onChange={(e) => handleProviderChange(e.target.value)}
          className="bg-white border border-dash-border rounded-lg px-3 py-2 text-xs !text-dash-text outline-none focus:border-primary"
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onBlur={handleUrlBlur}
          placeholder="Paste video link or ID..."
          className="flex-1 bg-white border border-dash-border rounded-lg px-3 py-2 text-xs !text-dash-text outline-none focus:border-primary font-mono"
        />
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-[10px] !text-dash-textMuted py-4 justify-center">
          <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> Fetching live preview...
        </div>
      )}

      {!isLoading && thumbnailUrl && (
        <div className="relative rounded-xl overflow-hidden aspect-video bg-black border border-dash-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumbnailUrl} alt="Video thumbnail preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <PlayCircle size={48} className="text-white drop-shadow-lg" />
          </div>
        </div>
      )}

      {!isLoading && error && (
        <div className="flex items-center gap-1.5 text-[10px] text-red py-2">
          <AlertCircle size={12} className="shrink-0" /> {error}
        </div>
      )}

      {!isLoading && unsupportedReason && (
        <div className="flex items-center gap-1.5 text-[10px] text-amber-600 py-2 bg-amber-50 border border-amber-200 rounded-lg px-3">
          <AlertCircle size={12} className="shrink-0" /> No live preview for this provider: {unsupportedReason} The link is still saved.
        </div>
      )}
    </div>
  );
}
