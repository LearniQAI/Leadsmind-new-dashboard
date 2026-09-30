"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { FileText, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import type { ContentBlock } from "../ContentBlockList";
import { PropertyGroup } from "@/components/builder/inspector/primitives";

type PdfCheckResult =
  | { status: "ok" }
  | { status: "invalid_url"; reason: string }
  | { status: "unreachable" }
  | { status: "http_error"; httpStatus: number }
  | { status: "not_pdf"; contentType: string | null };

/** What is persisted on block.content.pdf_check: the verdict AND the link it was for, so editing
 *  the link makes the old verdict stop applying (it can't vouch for a different URL). */
interface StoredPdfCheck {
  url: string;
  status: PdfCheckResult["status"] | "ok";
  message?: string;
}

function messageFor(r: PdfCheckResult): string {
  switch (r.status) {
    case "ok": return "Valid PDF";
    case "http_error": return `Link returned an error (HTTP ${r.httpStatus})`;
    case "not_pdf": return `This link doesn't point to a PDF${r.contentType ? ` (it returned ${r.contentType})` : ""}`;
    case "invalid_url": return r.reason;
    default: return "This link doesn't point to a reachable PDF";
  }
}

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
  const [isValidating, setIsValidating] = useState(false);

  // The link is saved either way (this editor autosaves every field and has no required-field
  // gate), so a bad or unchecked link is flagged persistently rather than blocking the save.
  const stored: StoredPdfCheck | undefined = block.content?.pdf_check;
  const currentUrl = urlInput.trim();
  const verdict = stored && stored.url === currentUrl ? stored : undefined;

  const handleValidate = async () => {
    if (!currentUrl) { toast.error("Paste a PDF link first"); return; }
    setIsValidating(true);
    try {
      const res = await fetch("/api/lms/validate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: currentUrl }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      const result = data as PdfCheckResult;
      const pdf_check: StoredPdfCheck = { url: currentUrl, status: result.status, message: messageFor(result) };
      // Validating also commits the link, exactly as blurring the field would.
      onChange({ file_url: currentUrl, content: { ...block.content, pdf_check } });
    } catch {
      toast.error("Couldn't run the check — try again");
    } finally {
      setIsValidating(false);
    }
  };

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
      // Our own storage URL, so there is nothing to validate.
      onChange({ file_url: data.url, content: { ...block.content, pdf_check: { url: data.url, status: "ok", message: "Uploaded PDF" } } });
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
    <div className="space-y-5">
      <PropertyGroup title="File Source">
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
          <button
            type="button"
            onClick={handleValidate}
            disabled={isValidating || !currentUrl}
            className="shrink-0 bg-dash-surface border border-dash-border hover:bg-dash-border/60 disabled:opacity-50 !text-dash-text text-[10px] font-bold px-3 rounded-lg inline-flex items-center gap-1.5"
          >
            {isValidating ? <><Loader2 size={12} className="animate-spin" /> Checking…</> : "Validate"}
          </button>
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
        {currentUrl && (
          <div role="status" aria-live="polite">
            {isValidating ? null : !verdict ? (
              <p className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-1.5">
                <AlertTriangle size={13} className="shrink-0" /> Link not validated — click Validate to confirm it's a reachable PDF
              </p>
            ) : verdict.status === "ok" ? (
              <p className="flex items-center gap-1.5 text-[10px] font-bold text-green bg-green/10 border border-green/20 rounded-lg px-3 py-2 mt-1.5">
                <CheckCircle2 size={13} className="shrink-0" /> {verdict.message || "Valid PDF"}
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-1.5">
                <XCircle size={13} className="shrink-0" /> {verdict.message}
                <span className="font-normal"> — saved anyway; students may not be able to open it.</span>
              </p>
            )}
          </div>
        )}
        </div>
      </PropertyGroup>

      <PropertyGroup title="Live Preview">
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
      </PropertyGroup>
    </div>
  );
}
