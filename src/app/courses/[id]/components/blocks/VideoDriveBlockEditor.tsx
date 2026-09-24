"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import type { ContentBlock } from "../ContentBlockList";
import { PropertyGroup } from "@/components/builder/inspector/primitives";
import { driveVideoUrls } from "@/lib/lms/video/driveVideoUrls";

interface VideoDriveBlockEditorProps {
  block: ContentBlock;
  onChange: (patch: Partial<ContentBlock>) => void;
}

type VideoAsset = {
  id: string;
  google_drive_file_id: string;
  share_url: string;
  filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  status: "pending" | "ready" | "broken";
  last_validation_error: string | null;
  last_validated_at: string | null;
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function formatSize(bytes: number): string {
  return bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.round(bytes / 1024 / 1024)} MB`;
}

// Google Drive source for the video block — the same paste → Validate → status → Recheck pattern
// as the audio block's Drive link panel (AudioDriveBlockEditor). Validation is server-side
// (POST /api/lms/video-assets): only a link that's genuinely public AND a browser-playable video
// flips the block to the 'gdrive' provider, so a half-configured block never reaches students.
// The live preview below is the real student player source (the gated stream proxy), not a
// thumbnail stand-in.
export default function VideoDriveBlockEditor({ block, onChange }: VideoDriveBlockEditorProps) {
  const assetId = block.video_asset_id ?? undefined;

  const [shareUrlInput, setShareUrlInput] = useState<string>("");
  const [asset, setAsset] = useState<VideoAsset | null>(null);
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
        const res = await fetch(`/api/lms/video-assets/${assetId}`);
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
      const res = await fetch("/api/lms/video-assets", {
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
        // The server has already pointed the block at this asset. This syncs the host's local copy
        // (video_asset_id is ignored by the PATCH route, so it can't overwrite the server's value).
        onChange({ video_provider: "gdrive", video_asset_id: data.data.id, completion_rule: "watched_threshold" });
        setShareUrlInput("");
        toast.success("Video link validated");
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
      const res = await fetch(`/api/lms/video-assets/${asset.id}/recheck`, { method: "POST" });
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

  // Only preview the asset the block actually plays (a just-failed validation of a different link
  // leaves the block on its previous, still-ready asset).
  const drive = asset?.status === "ready" && asset.id === block.video_asset_id ? driveVideoUrls(block) : null;

  return (
    <>
      <PropertyGroup title="Google Drive link">
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <input
              type="url"
              value={shareUrlInput}
              onChange={(e) => setShareUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleValidate();
              }}
              placeholder={asset ? "Paste a different Drive link..." : "https://drive.google.com/file/d/.../view"}
              className="flex-1 min-w-0 bg-white border border-dash-border rounded-lg px-3 py-2 text-xs !text-dash-text outline-none focus:border-primary font-mono"
            />
            <button
              type="button"
              onClick={handleValidate}
              disabled={isValidating || !shareUrlInput.trim()}
              className="shrink-0 bg-dash-accent text-white text-[10px] font-bold px-4 rounded-lg disabled:opacity-50"
            >
              {isValidating ? "Validating..." : "Validate"}
            </button>
          </div>
          <p className="text-[10px] !text-dash-textMuted">
            Share the file as &quot;Anyone with the link&quot;. MP4 (H.264) plays everywhere; WebM and most MOV files work too.
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
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="break-words">
                {asset.status === "ready"
                  ? `Ready — ${asset.filename || "video file"}`
                  : asset.last_validation_error || "This link is broken."}
              </div>
              {asset.status === "ready" && (
                <div className="font-normal !text-dash-textMuted">
                  {[
                    asset.mime_type,
                    asset.duration_seconds ? formatDuration(Number(asset.duration_seconds)) : null,
                    asset.width && asset.height ? `${asset.width}×${asset.height}` : null,
                    asset.size_bytes ? formatSize(asset.size_bytes) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
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

      <PropertyGroup title="Live Preview">
        {drive ? (
          <>
            <div className="rounded-xl overflow-hidden aspect-video bg-black border border-dash-border">
              <video src={drive.src} poster={drive.poster} controls playsInline preload="metadata" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-green bg-green/10 border border-green/20 rounded-lg px-3 py-2 mt-2">
              <CheckCircle2 size={13} className="shrink-0" /> Streaming from Google Drive — this is exactly what students will play
            </div>
          </>
        ) : (
          <div className="text-[10px] !text-dash-textMuted py-4 text-center border border-dashed border-dash-border rounded-xl">
            {isLoadingAsset ? "Loading..." : "Validate a Drive link above to preview it"}
          </div>
        )}
      </PropertyGroup>
    </>
  );
}
