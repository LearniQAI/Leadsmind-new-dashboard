"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DashButton } from "@/components/dashboard-ui";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onCancel: () => void;
  /** dontRemindAgain is true only when the user explicitly ticked the box. */
  onConfirm: (dontRemindAgain: boolean) => void;
}

const LEVELS = [
  { label: "Learning Site / Domain", hint: "where it lives" },
  { label: "Course", hint: "you are creating this", current: true },
  { label: "Module", hint: "add inside a course" },
  { label: "Lesson", hint: "add inside a module" },
];

export default function NewCourseAcknowledgement({ open, onCancel, onConfirm }: Props) {
  const [dontRemind, setDontRemind] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setDontRemind(false); onCancel(); } }}>
      <DialogContent className="sm:max-w-[520px] z-[1100] bg-white border-dash-border !text-dash-text">
        <DialogHeader>
          <DialogTitle>You Are Creating a New Course</DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed !text-dash-textMuted">
            You are about to create a new Course, not a Module or Lesson. A Course is a complete learning program with
            its own curriculum, student enrollment, progress tracking and completion status. If you are trying to add
            another section to an existing Course, please go back and open that Course, then select &lsquo;Add Module&rsquo;.
          </DialogDescription>
        </DialogHeader>

        <ol aria-label="Hierarchy" className="flex flex-wrap items-stretch gap-1.5 py-1">
          {LEVELS.map((l, i) => (
            <React.Fragment key={l.label}>
              <li
                aria-current={l.current ? "step" : undefined}
                className={cn(
                  "flex-1 min-w-[100px] rounded-lg border px-2.5 py-2 text-center",
                  l.current ? "border-dash-accent bg-dash-accent/10" : "border-dash-border bg-dash-surface/50"
                )}
              >
                <div className={cn("text-[11.5px] font-semibold", l.current ? "text-dash-accent" : "!text-dash-text")}>{l.label}</div>
                <div className="text-[10px] !text-dash-textMuted">{l.hint}</div>
              </li>
              {i < LEVELS.length - 1 && <ChevronRight size={14} className="self-center shrink-0 !text-dash-textMuted" aria-hidden />}
            </React.Fragment>
          ))}
        </ol>

        <label className="flex items-center gap-2 text-[12px] !text-dash-textMuted cursor-pointer">
          <input type="checkbox" checked={dontRemind} onChange={(e) => setDontRemind(e.target.checked)} />
          Don&rsquo;t remind me for 30 days
        </label>

        <DialogFooter className="gap-2">
          <DashButton variant="secondary" size="sm" onClick={() => { setDontRemind(false); onCancel(); }}>
            No, Go Back
          </DashButton>
          <DashButton variant="primary" size="sm" onClick={() => { const v = dontRemind; setDontRemind(false); onConfirm(v); }}>
            Yes, Create New Course
          </DashButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
