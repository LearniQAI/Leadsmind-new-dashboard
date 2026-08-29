"use client";

import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { ContentBlock } from "../ContentBlockList";
import { PropertyGroup } from "@/components/builder/inspector/primitives";

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
    <div className="space-y-5">
      <PropertyGroup title="Meeting Source">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold !text-dash-textMuted block">Meeting URL (Zoom / Meet / Teams)</label>
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onBlur={handleBlur}
            placeholder="https://zoom.us/j/..."
            className="w-full bg-white border border-dash-border rounded-lg px-3 py-2 text-xs !text-dash-text outline-none focus:border-primary font-mono"
          />
          {block.file_url && (
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-green bg-green/10 border border-green/20 rounded-lg px-3 py-2">
              <CheckCircle2 size={13} className="shrink-0" /> Meeting link saved
            </div>
          )}
        </div>
      </PropertyGroup>
    </div>
  );
}
