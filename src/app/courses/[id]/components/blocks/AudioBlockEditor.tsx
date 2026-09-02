"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { VoiceNotePlayer } from "@/components/common/VoiceNotePlayer";
import { decodeWaveformPeaks } from "@/lib/audio/decodeWaveformPeaks";
import type { ContentBlock } from "../ContentBlockList";
import { PropertyGroup } from "@/components/builder/inspector/primitives";
import { SandboxedHtml } from "@/components/lms/SandboxedHtml";

interface AudioBlockEditorProps {
  block: ContentBlock;
  onChange: (patch: Partial<ContentBlock>) => void;
}

type AudioMode = "upload" | "embed";

export default function AudioBlockEditor({ block, onChange }: AudioBlockEditorProps) {
  const mode: AudioMode = block.content?.mode === "embed" ? "embed" : "upload";

  const [urlInput, setUrlInput] = useState(block.file_url || "");
  const [embedInput, setEmbedInput] = useState<string>(block.content?.embed_html || "");
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

  // Switching modes also re-points completion_rule. Upload/Link mode keeps its real
  // waveform-based watched_threshold tracking; Embed-code mode can't observe a third-party
  // player's real progress from outside the sandbox, so it degrades to 'opened' (an honest
  // "the student reached this block" signal) rather than faking a watched percentage.
  const switchMode = (next: AudioMode) => {
    if (next === mode) return;
    if (next === "embed") {
      onChange({
        content: { ...block.content, mode: "embed" },
        completion_rule: "opened",
        completion_threshold: null,
      });
    } else {
      onChange({
        content: { ...block.content, mode: "upload" },
        completion_rule: "watched_threshold",
        completion_threshold: block.completion_threshold ?? 90,
      });
    }
  };

  const handleEmbedBlur = () => {
    const trimmed = embedInput.trim();
    if (trimmed === (block.content?.embed_html || "")) return;
    onChange({ content: { ...block.content, mode: "embed", embed_html: trimmed } });
  };

  return (
    <div className="space-y-5">
      <PropertyGroup title="Audio Source">
        {/* Mode toggle */}
        <div className="flex gap-1 p-0.5 rounded-lg bg-dash-surface ring-1 ring-inset ring-dash-border">
          {([
            { id: "upload", label: "Upload / Link" },
            { id: "embed", label: "Embed code" },
          ] as const).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchMode(id)}
              className={`flex-1 rounded-md py-1.5 text-[10px] font-bold transition-all motion-reduce:transition-none ${
                mode === id
                  ? "bg-dash-accent text-white shadow-[0_1px_3px_rgba(0,0,0,0.18)]"
                  : "!text-dash-textMuted hover:!text-dash-text hover:bg-white/70"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "upload" ? (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold !text-dash-textMuted block">Audio file</label>
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
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold !text-dash-textMuted block">Embed snippet (HTML)</label>
            <textarea
              value={embedInput}
              onChange={(e) => setEmbedInput(e.target.value)}
              onBlur={handleEmbedBlur}
              rows={5}
              placeholder={'<iframe src="https://podcasts.example.com/embed/episode/123" ...></iframe>'}
              className="w-full bg-white border border-dash-border rounded-lg px-3 py-2 text-[11px] !text-dash-text outline-none focus:border-primary font-mono leading-relaxed"
            />
            <div className="flex items-start gap-1.5 text-[10px] !text-dash-textMuted">
              <ShieldCheck size={12} className="shrink-0 mt-0.5 text-green" />
              Paste an embed snippet from a podcast host or audio platform.
            </div>
          </div>
        )}
      </PropertyGroup>

      <PropertyGroup title="Live Preview">
        {mode === "upload" ? (
          <>
            {isDecoding && (
              <div className="flex items-center gap-2 text-[10px] !text-dash-textMuted py-4 justify-center border border-dash-border rounded-xl bg-dash-surface">
                <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> Generating waveform from audio...
              </div>
            )}

            {!isDecoding && block.file_url && (
              <>
                <VoiceNotePlayer audioUrl={block.file_url} waveformBars={waveformBars} theme="light" />
                {waveformBars.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-green bg-green/10 border border-green/20 rounded-lg px-3 py-2 mt-2">
                    <CheckCircle2 size={13} className="shrink-0" /> Real waveform generated from the uploaded audio
                  </div>
                )}
              </>
            )}

            {!isDecoding && !block.file_url && (
              <div className="text-[10px] !text-dash-textMuted py-4 text-center border border-dashed border-dash-border rounded-xl">
                Upload or link a file above to generate a waveform preview
              </div>
            )}

            {!isDecoding && decodeError && (
              <p className="text-[10px] text-amber-600 mt-1">{decodeError}</p>
            )}
          </>
        ) : embedInput.trim() ? (
          <>
            <SandboxedHtml
              html={embedInput}
              className="rounded-lg overflow-hidden border border-dash-border h-[180px] bg-dash-surface"
              title="Audio embed preview"
            />
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-green bg-green/10 border border-green/20 rounded-lg px-3 py-2 mt-2">
              <CheckCircle2 size={13} className="shrink-0" /> This is what students will see. Completion: marked when the student opens this block.
            </div>
          </>
        ) : (
          <div className="text-[10px] !text-dash-textMuted py-4 text-center border border-dashed border-dash-border rounded-xl">
            Paste an embed snippet above to preview it
          </div>
        )}
      </PropertyGroup>
    </div>
  );
}
