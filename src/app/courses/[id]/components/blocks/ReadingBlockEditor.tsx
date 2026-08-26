"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { FileText, CheckCircle2 } from "lucide-react";
import type { ContentBlock } from "../ContentBlockList";

interface ReadingBlockEditorProps {
  block: ContentBlock;
  onChange: (patch: Partial<ContentBlock>) => void;
}

// Shared by both the "reading" (PDF) and "slides" (PPT/PDF embed) block types — same
// upload-or-link pattern, same PDF viewer reused on the student side (PRD Section 6:
// "reuse the reading block's PDF viewer where feasible rather than building a second one").
export default function ReadingBlockEditor({ block, onChange }: ReadingBlockEditorProps) {
  const [urlInput, setUrlInput] = useState(block.file_url || "");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("pathPrefix", `lms/${block.type}`);

    try {
      const res = await fetch("/api/lms/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) {
        toast.error(`Upload failed: ${data.error}`);
        return;
      }
      setUrlInput(data.url);
      onChange({ file_url: data.url });
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
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold !text-dash-textMuted block">PDF file</label>
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onBlur={handleUrlBlur}
            placeholder="Paste PDF link..."
            className="flex-1 bg-white border border-dash-border rounded-lg px-3 py-2 text-xs !text-dash-text outline-none focus:border-primary font-mono"
          />
          <div className="relative shrink-0">
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              disabled={isUploading}
            />
            <button
              type="button"
              disabled={isUploading}
              className="h-full bg-dash-surface border border-dash-border hover:bg-dash-border/60 !text-dash-text text-[10px] font-bold px-4 rounded-lg"
            >
              {isUploading ? "Uploading..." : "Upload PDF"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold !text-dash-textMuted block">Live preview</label>
        {block.file_url ? (
          <>
            <div className="rounded-xl overflow-hidden border border-dash-border h-40 bg-dash-surface">
              <iframe src={block.file_url} className="w-full h-full border-0" title="PDF preview" />
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-green bg-green/10 border border-green/20 rounded-lg px-3 py-2 mt-2">
              <CheckCircle2 size={13} className="shrink-0" /> PDF attached — opens in a 60%-of-screen modal for students, never a new tab
            </div>
          </>
        ) : (
          <div className="text-[10px] !text-dash-textMuted py-4 text-center border border-dashed border-dash-border rounded-xl flex items-center justify-center gap-1.5">
            <FileText size={12} /> Upload or link a PDF above
          </div>
        )}
      </div>
    </div>
  );
}
