"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import type { ContentBlock } from "../ContentBlockList";
import { PropertyGroup } from "@/components/builder/inspector/primitives";

type ResourceLinkCheck =
  | { status: "ok"; source: "drive"; name: string | null; mimeType: string | null; size: number | null }
  | { status: "ok"; source: "url" }
  | { status: "invalid_url"; reason: string }
  | { status: "not_shared" }
  | { status: "unreachable" }
  | { status: "http_error"; httpStatus: number };

/** What is persisted on block.content.link_check: the verdict AND the link it was for, so
 *  editing the link makes the old verdict stop applying (it can't vouch for a different URL). */
interface StoredLinkCheck {
  url: string;
  status: ResourceLinkCheck["status"];
  message: string;
}

function messageFor(r: ResourceLinkCheck): string {
  switch (r.status) {
    case "ok": return r.source === "drive" ? `Ready${r.name ? ` — ${r.name}` : ""}` : "Link is reachable";
    case "not_shared": return `Not shared — set Drive sharing to "Anyone with the link"`;
    case "http_error": return `Link returned an error (HTTP ${r.httpStatus})`;
    case "invalid_url": return r.reason;
    default: return "This link isn't reachable";
  }
}

interface DownloadBlockEditorProps {
  block: ContentBlock;
  onChange: (patch: Partial<ContentBlock>) => void;
}

// Shared by every "Downloadable resource" field in the app (ContentBox and LessonBlockNode's
// `download` block type, both course templates route here — see ContentBoxSettings.tsx and
// LessonBlockNodeSettings.tsx) — one component, so this fix reaches all of them at once. No
// special provider logic beyond that (PRD Section 5) — a plain file upload/link and a
// student-facing download link, reusing the same upload endpoint every other file field uses.
export default function DownloadBlockEditor({ block, onChange }: DownloadBlockEditorProps) {
  const [urlInput, setUrlInput] = useState(block.file_url || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Same pattern as ReadingBlockEditor: the link autosaves on blur either way, so a bad or
  // unchecked link is flagged persistently rather than blocking the save.
  const stored: StoredLinkCheck | undefined = block.content?.link_check;
  const currentUrl = urlInput.trim();
  const verdict = stored && stored.url === currentUrl ? stored : undefined;

  const handleValidate = async () => {
    if (!currentUrl) { toast.error("Paste a resource link first"); return; }
    setIsValidating(true);
    try {
      const res = await fetch("/api/lms/validate-resource-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: currentUrl }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      const result = data as ResourceLinkCheck;
      const link_check: StoredLinkCheck = { url: currentUrl, status: result.status, message: messageFor(result) };
      // Validating also commits the link, exactly as blurring the field would — the explicit
      // button is the primary path now, but tabbing/clicking away still saves as a fallback.
      onChange({ file_url: currentUrl, content: { ...block.content, link_check } });
      if (result.status === "ok") toast.success("Link validated");
      else toast.error(link_check.message);
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
    formData.append("pathPrefix", "lms/download");

    try {
      const res = await fetch("/api/lms/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) {
        toast.error(`Upload failed: ${data.error}`);
        return;
      }
      setUrlInput(data.url);
      // Our own storage URL, so there is nothing to validate — same as ReadingBlockEditor's upload path.
      const link_check: StoredLinkCheck = { url: data.url, status: "ok", message: `Uploaded — ${data.name}` };
      onChange({ file_url: data.url, content: { ...block.content, file_name: data.name, link_check } });
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
          <label className="text-[10px] font-bold !text-dash-textMuted block">Resource file</label>
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onBlur={handleUrlBlur}
            placeholder="Paste a resource link..."
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
        {currentUrl && (
          <div role="status" aria-live="polite">
            {isValidating ? null : !verdict ? (
              <p className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-1.5">
                <AlertTriangle size={13} className="shrink-0" /> Link not validated — click Validate to confirm it's reachable
              </p>
            ) : verdict.status === "ok" ? (
              <p className="flex items-center gap-1.5 text-[10px] font-bold text-green bg-green/10 border border-green/20 rounded-lg px-3 py-2 mt-1.5">
                <CheckCircle2 size={13} className="shrink-0" />
                <span className="truncate">{verdict.message}</span>
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-1.5">
                <XCircle size={13} className="shrink-0" /> {verdict.message}
                <span className="font-normal"> — saved anyway; students may not be able to open it.</span>
              </p>
            )}
          </div>
        )}
      </PropertyGroup>
    </div>
  );
}
