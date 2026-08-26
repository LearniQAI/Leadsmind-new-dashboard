"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { VoiceNotePlayer } from "@/components/common/VoiceNotePlayer";
import { decodeWaveformPeaks } from "@/lib/audio/decodeWaveformPeaks";
import type { ContentBlock } from "../ContentBlockList";

interface AudioBlockEditorProps {
  block: ContentBlock;
  onChange: (patch: Partial<ContentBlock>) => void;
}

export default function AudioBlockEditor({ block, onChange }: AudioBlockEditorProps) {
  const [urlInput, setUrlInput] = useState(block.file_url || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const waveformBars: number[] = block.content?.waveform_bars || [];

  const generateWaveform = async (source: File | string, resolvedUrl: string) => {
    setIsDecoding(true);
    setDecodeError(null);
    try {
      const bars = await decodeWaveformPeaks(source);
      onChange({ file_url: resolvedUrl, content: { ...block.content, waveform_bars: bars } });
    } catch (err: any) {
      setDecodeError("Could not generate a waveform preview for this file — the link is still saved.");
      onChange({ file_url: resolvedUrl });
    } finally {
      setIsDecoding(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("pathPrefix", "lms/audio");

    try {
      const res = await fetch("/api/lms/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) {
        toast.error(`Upload failed: ${data.error}`);
        return;
      }
      setUrlInput(data.url);
      await generateWaveform(file, data.url);
      toast.success("Audio file uploaded");
    } catch {
      toast.error("Network error uploading file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlBlur = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed || trimmed === block.file_url) return;
    await generateWaveform(trimmed, trimmed);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onBlur={handleUrlBlur}
          placeholder="Paste audio file link..."
          className="flex-1 bg-white border border-dash-border rounded-lg px-3 py-2 text-xs !text-dash-text outline-none focus:border-primary font-mono"
        />
        <div className="relative shrink-0">
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            disabled={isUploading}
          />
          <button
            type="button"
            disabled={isUploading}
            className="h-full bg-dash-surface border border-dash-border hover:bg-dash-border/60 !text-dash-text text-[10px] font-bold px-4 rounded-lg"
          >
            {isUploading ? "Uploading..." : "Upload File"}
          </button>
        </div>
      </div>

      {isDecoding && (
        <div className="flex items-center gap-2 text-[10px] !text-dash-textMuted py-4 justify-center">
          <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> Generating waveform from audio...
        </div>
      )}

      {!isDecoding && block.file_url && (
        <VoiceNotePlayer audioUrl={block.file_url} waveformBars={waveformBars} theme="light" />
      )}

      {!isDecoding && decodeError && (
        <p className="text-[10px] text-amber-600">{decodeError}</p>
      )}
    </div>
  );
}
