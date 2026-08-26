"use client";

import React, { useState } from "react";
import type { ContentBlock } from "../ContentBlockList";

interface LiveSessionBlockEditorProps {
  block: ContentBlock;
  onChange: (patch: Partial<ContentBlock>) => void;
}

// Plain Zoom/Meet/Teams link at this stage per the PRD — real video-conferencing
// integration (auto-generating meeting links, calendar sync) is the separate Calendar-module
// Task 70, not conflated here.
export default function LiveSessionBlockEditor({ block, onChange }: LiveSessionBlockEditorProps) {
  const [urlInput, setUrlInput] = useState(block.file_url || "");

  const handleBlur = () => {
    const trimmed = urlInput.trim();
    if (trimmed && trimmed !== block.file_url) onChange({ file_url: trimmed });
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold !text-dash-textMuted block">Meeting URL (Zoom / Meet / Teams)</label>
      <input
        type="url"
        value={urlInput}
        onChange={(e) => setUrlInput(e.target.value)}
        onBlur={handleBlur}
        placeholder="https://zoom.us/j/..."
        className="w-full bg-white border border-dash-border rounded-lg px-3 py-2 text-xs !text-dash-text outline-none focus:border-primary font-mono"
      />
    </div>
  );
}
