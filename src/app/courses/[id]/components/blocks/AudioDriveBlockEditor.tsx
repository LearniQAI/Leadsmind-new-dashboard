"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertTriangle, RefreshCw, ArrowUpRight } from "lucide-react";
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

// Phase 1 shipped this as "just enough to test the pipeline" (link paste, validate/recheck
// status, plain inline speaker/chapter/transcript forms). Phase 3 Part B built the real
// authoring tool for those — the Audio Lesson Builder screen, with a live student-accurate
// preview and a real timeline editor — so this panel now stays scoped to what only makes sense
// at the 320px canvas-settings width: pasting/validating the link. Once ready, it links out to
// the full screen rather than duplicating a second, lesser editing surface for the same data.
export default function AudioDriveBlockEditor({ block, onChange }: AudioDriveBlockEditorProps) {
  const params = useParams();
  const courseId = params.id as string;
  const assetId: string | undefined = block.content?.audio_asset_id;

  const [shareUrlInput, setShareUrlInput] = useState<string>("");
  const [asset, setAsset] = useState<AudioAsset | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isLoadingAsset, setIsLoadingAsset] = useState(!!assetId);

  useEffect(() => {
    if (!assetId) {
      setIsLoadingAsset(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/lms/audio-assets/${assetId}`);
        const data = await res.json();
        if (!cancelled && !data.error) setAsset(data.data);
      } finally {
        if (!cancelled) setIsLoadingAsset(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assetId]);

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

      {asset?.status === "ready" && (
        <Link
          href={`/courses/${courseId}/lessons/${block.lesson_id}/audio/${block.id}`}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-dash-accent px-4 py-2.5 text-[11px] font-bold text-white transition-opacity hover:opacity-90"
        >
          Open full audio editor <ArrowUpRight size={13} />
        </Link>
      )}
      {!asset && !isLoadingAsset && (
        <p className="text-center text-[10px] !text-dash-textMuted">
          Speakers, transcript, and chapters open up once a link validates.
        </p>
      )}
    </div>
  );
}
