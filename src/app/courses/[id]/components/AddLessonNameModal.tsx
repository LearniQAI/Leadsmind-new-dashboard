"use client";

import React, { useState } from "react";
import { X, Loader2, Sparkles, ChevronLeft, FileX2 } from "lucide-react";
import { toast } from "sonner";
import { LESSON_TEMPLATES } from "@/lib/builder/lessonTemplates";
import { LessonTemplateMiniPreview } from "./LessonTemplateMiniPreview";

// Lesson Builder Foundation (Part 1, Step 2) + Premium Lesson Starter Templates (Part 3,
// Step 2): "+ Add Lesson" is a 2-stage flow — name the lesson, then pick a real starter
// template (or start blank) — before returning to the module's lesson list. The full canvas
// editor still opens separately when the lesson's name is clicked, not inline here.
interface AddLessonNameModalProps {
  moduleId: string;
  courseId: string;
  workspaceId: string;
  onClose: () => void;
  onCreated: (lesson: any) => void;
  position: number;
}

export default function AddLessonNameModal({ moduleId, courseId, workspaceId, onClose, onCreated, position }: AddLessonNameModalProps) {
  const [stage, setStage] = useState<"name" | "template">("name");
  const [title, setTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);

  const handleCreate = async (templateId: string | null) => {
    setIsCreating(true);
    setCreatingTemplateId(templateId);
    try {
      const res = await fetch("/api/lms/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module_id: moduleId,
          course_id: courseId,
          workspace_id: workspaceId,
          title: title.trim(),
          lesson_type: "text",
          content: {},
          position,
          create_builder_page: true,
          template_id: templateId
        })
      });
      const dataJson = await res.json();
      if (dataJson.error) {
        toast.error(dataJson.error);
      } else {
        toast.success("Lesson created.");
        onCreated(dataJson.data);
        onClose();
      }
    } catch {
      toast.error("Failed to create lesson");
    } finally {
      setIsCreating(false);
      setCreatingTemplateId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[600] flex items-start justify-center overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`my-auto w-full overflow-hidden rounded-2xl border border-dash-border bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.35)] transition-all ${stage === "name" ? "max-w-sm" : "max-w-2xl"}`}>
        <div className="flex items-start justify-between gap-4 border-b border-dash-border px-6 py-5">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600">
              {stage === "template" && (
                <button onClick={() => setStage("name")} className="mr-0.5 -ml-1 rounded p-0.5 hover:bg-dash-surface">
                  <ChevronLeft size={14} />
                </button>
              )}
              <Sparkles size={12} /> New lesson
            </div>
            <h2 className="font-display text-[17px] font-semibold leading-tight tracking-[-0.01em] text-dash-text">
              {stage === "name" ? "Name your lesson" : "Choose a starting point"}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-dash-textMuted transition-colors hover:bg-dash-surface hover:text-dash-text"
          >
            <X size={18} />
          </button>
        </div>

        {stage === "name" ? (
          <>
            <div className="px-6 py-5 space-y-4">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && title.trim() && setStage("template")}
                placeholder="e.g. Introduction to the course"
                className="h-11 w-full rounded-lg border border-dash-border bg-white px-3.5 text-[13px] text-dash-text outline-none transition-colors placeholder:text-dash-textMuted focus:border-sky-500 focus:ring-4 focus:ring-sky-500/12"
              />
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-dash-border bg-dash-surface px-6 py-4">
              <button
                onClick={onClose}
                className="h-9 px-4 rounded-lg text-[12px] font-semibold text-dash-textMuted hover:text-dash-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => title.trim() && setStage("template")}
                disabled={!title.trim()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-sky-500 px-4 text-[12px] font-semibold text-white transition-colors hover:bg-sky-600 disabled:opacity-60"
              >
                Next: pick a layout
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="px-6 py-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Start blank — always available, per Part 3 Step 2 */}
                <button
                  onClick={() => handleCreate(null)}
                  disabled={isCreating}
                  className="group text-left rounded-xl border border-dash-border hover:border-sky-400 bg-white overflow-hidden transition-colors disabled:opacity-60"
                >
                  <div className="aspect-[4/3] bg-dash-surface flex items-center justify-center">
                    {isCreating && creatingTemplateId === null ? (
                      <Loader2 size={18} className="animate-spin text-sky-500" />
                    ) : (
                      <FileX2 size={20} className="text-dash-textMuted" />
                    )}
                  </div>
                  <div className="p-2.5">
                    <div className="text-[12px] font-semibold text-dash-text">Start blank</div>
                    <div className="text-[10px] text-dash-textMuted mt-0.5">An empty canvas</div>
                  </div>
                </button>

                {LESSON_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleCreate(tpl.id)}
                    disabled={isCreating}
                    className="group relative text-left rounded-xl border border-dash-border hover:border-sky-400 bg-white overflow-hidden transition-colors disabled:opacity-60"
                  >
                    <div className="aspect-[4/3] bg-dash-surface">
                      <LessonTemplateMiniPreview templateId={tpl.id} />
                    </div>
                    {isCreating && creatingTemplateId === tpl.id && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                        <Loader2 size={18} className="animate-spin text-sky-500" />
                      </div>
                    )}
                    <div className="p-2.5">
                      <div className="text-[12px] font-semibold text-dash-text flex items-center gap-1">
                        {tpl.name}
                      </div>
                      <div className="text-[10px] text-dash-textMuted mt-0.5 line-clamp-2">{tpl.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
