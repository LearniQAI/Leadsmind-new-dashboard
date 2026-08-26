"use client";

import React, { useState } from "react";
import { sanitizeRichTextHtml } from "@/lib/security/sanitizeHtml";
import type { ContentBlock } from "../ContentBlockList";

interface RichTextBlockEditorProps {
  block: ContentBlock;
  onChange: (patch: Partial<ContentBlock>) => void;
}

// No dedicated editor existed for this block type (a real gap found during Phase E's audit —
// "rich_text" fell through to the null default). Content lives directly in
// content_blocks.content.text, sanitized on render the same way as everywhere else in the
// app (sanitizeRichTextHtml, shared with the blog/builder Text component's XSS discipline).
export default function RichTextBlockEditor({ block, onChange }: RichTextBlockEditorProps) {
  const [text, setText] = useState(block.content?.text || "");

  const handleBlur = () => {
    if (text !== block.content?.text) {
      onChange({ content: { ...block.content, text } });
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold !text-dash-textMuted block">Content</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          placeholder="Write the lesson text here — basic HTML is supported..."
          rows={5}
          className="w-full bg-white border border-dash-border rounded-lg px-3 py-2 text-xs !text-dash-text placeholder:!text-dash-textMuted outline-none focus:border-primary font-mono leading-relaxed"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold !text-dash-textMuted block">Live preview</label>
        {text.trim() ? (
          <div
            className="rounded-xl border border-dash-border bg-dash-surface p-3 text-xs !text-dash-text leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(text) }}
          />
        ) : (
          <div className="text-[10px] !text-dash-textMuted py-4 text-center border border-dashed border-dash-border rounded-xl">
            Nothing to preview yet
          </div>
        )}
      </div>
    </div>
  );
}
