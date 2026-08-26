"use client";

import React, { useState } from "react";
import type { ContentBlock } from "../ContentBlockList";

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
    <div className="space-y-2">
      <label className="text-[10px] font-bold !text-dash-textMuted block">Assignment Instructions</label>
      <textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        onBlur={handleBlur}
        placeholder="Explain what the student needs to submit..."
        rows={4}
        className="w-full bg-white border border-dash-border rounded-lg px-3 py-2 text-xs !text-dash-text placeholder:!text-dash-textMuted outline-none focus:border-primary font-mono leading-relaxed"
      />
      <p className="text-[9px] !text-dash-textMuted">
        Students submit text and/or a file attachment, gradable from the existing assignment grading flow.
      </p>
    </div>
  );
}
