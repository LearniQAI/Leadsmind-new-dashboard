"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { ContentBlock } from "../ContentBlockList";
import { PropertyGroup } from "@/components/builder/inspector/primitives";

interface AssignmentBlockEditorProps {
  block: ContentBlock;
  onChange: (patch: Partial<ContentBlock>) => void;
}

// Submissions themselves go through the existing lms_assignment_submissions table (keyed by
// lesson_id) and the existing /api/lms/assignments student flow — reused as-is, not
// duplicated. This editor only manages the instructions text shown to the student.
export default function AssignmentBlockEditor({ block, onChange }: AssignmentBlockEditorProps) {
  const [instructions, setInstructions] = useState(block.content?.instructions || "");

  const handleBlur = () => {
    if (instructions !== block.content?.instructions) {
      onChange({ content: { ...block.content, instructions } });
    }
  };

  return (
    <div className="space-y-5">
      <PropertyGroup title="Assignment Instructions">
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          onBlur={handleBlur}
          placeholder="Explain what the student needs to submit..."
          rows={4}
          className="w-full bg-white border border-dash-border rounded-lg px-3 py-2 text-xs !text-dash-text placeholder:!text-dash-textMuted outline-none focus:border-primary font-mono leading-relaxed"
        />
        {instructions.trim() ? (
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-green bg-green/10 border border-green/20 rounded-lg px-3 py-2">
            <CheckCircle2 size={13} className="shrink-0" /> Instructions set — students submit text and/or a file attachment
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertCircle size={13} className="shrink-0" /> No instructions yet
          </div>
        )}
      </PropertyGroup>
    </div>
  );
}
