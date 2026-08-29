"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { isSafeEmbedUrl } from "@/lib/security/isSafeEmbedUrl";
import type { ContentBlock } from "../ContentBlockList";
import { PropertyGroup } from "@/components/builder/inspector/primitives";

interface EmbedBlockEditorProps {
  block: ContentBlock;
  onChange: (patch: Partial<ContentBlock>) => void;
}

// External embed (PRD Section 5/6) — the same category of XSS concern as the blog
// body_html/builder Text sanitization work already done in this codebase. Rather than
// accepting a raw pasted HTML/iframe snippet and running it through DOMPurify (which still
// leaves a innerHTML-injection surface), the embed URL itself is validated to be http(s)
// only and rendered as a real <iframe src> React element — never dangerouslySetInnerHTML —
// so there is no HTML-string attack surface at all.
export default function EmbedBlockEditor({ block, onChange }: EmbedBlockEditorProps) {
  const [urlInput, setUrlInput] = useState(block.content?.embed_url || "");
  const isValid = !urlInput.trim() || isSafeEmbedUrl(urlInput.trim());

  const handleBlur = () => {
    const trimmed = urlInput.trim();
    if (trimmed && isSafeEmbedUrl(trimmed) && trimmed !== block.content?.embed_url) {
      onChange({ content: { ...block.content, embed_url: trimmed } });
    }
  };

  return (
    <div className="space-y-5">
      <PropertyGroup title="Embed Source">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold !text-dash-textMuted block">Embed URL</label>
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onBlur={handleBlur}
            placeholder="https://example.com/widget"
            className="w-full bg-white border border-dash-border rounded-lg px-3 py-2 text-xs !text-dash-text outline-none focus:border-primary font-mono"
          />
          {!isValid && (
            <div className="flex items-center gap-1.5 text-[10px] text-red">
              <AlertCircle size={12} className="shrink-0" /> Only http(s) links are allowed in an embed.
            </div>
          )}
        </div>
      </PropertyGroup>

      {isValid && block.content?.embed_url && (
        <PropertyGroup title="Live Preview">
          <div className="rounded-lg overflow-hidden border border-dash-border aspect-video bg-dash-surface">
            <iframe
              src={block.content.embed_url}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              title="Embed preview"
            />
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-green bg-green/10 border border-green/20 rounded-lg px-3 py-2">
            <CheckCircle2 size={13} className="shrink-0" /> Embed validated — this is what students will see
          </div>
        </PropertyGroup>
      )}
    </div>
  );
}
