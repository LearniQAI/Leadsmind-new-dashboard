"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import type { ContentBlock } from "../ContentBlockList";

interface DownloadBlockEditorProps {
  block: ContentBlock;
  onChange: (patch: Partial<ContentBlock>) => void;
}

// No special provider logic needed (PRD Section 5) — a plain file upload/link and a
// student-facing download link, reusing the same upload endpoint every other file field uses.
export default function DownloadBlockEditor({ block, onChange }: DownloadBlockEditorProps) {
  const [urlInput, setUrlInput] = useState(block.file_url || "");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("pathPrefix", "lms/download");

    try {
      const res = await fetch("/api/lms/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) {
        toast.error(`Upload failed: ${data.error}`);
        return;
      }
      setUrlInput(data.url);
      onChange({ file_url: data.url, content: { ...block.content, file_name: data.name } });
      toast.success("File uploaded");
    } catch {
      toast.error("Network error uploading file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlBlur = () => {
    const trimmed = urlInput.trim();
    if (trimmed && trimmed !== block.file_url) onChange({ file_url: trimmed });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onBlur={handleUrlBlur}
          placeholder="Paste a resource link..."
          className="flex-1 bg-white border border-dash-border rounded-lg px-3 py-2 text-xs !text-dash-text outline-none focus:border-primary font-mono"
        />
        <div className="relative shrink-0">
          <input
            type="file"
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
      {block.file_url && (
        <div className="flex items-center gap-1.5 text-[10px] !text-dash-textMuted">
          <Download size={12} className="shrink-0" />
          <span className="truncate">{block.content?.file_name || block.file_url}</span>
        </div>
      )}
    </div>
  );
}
