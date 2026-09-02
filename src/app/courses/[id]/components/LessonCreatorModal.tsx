"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Loader2,
  X,
  BookOpen,
  Plus,
  Sparkles,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import ContentBlockList, { ContentBlock } from "./ContentBlockList";
import VideoBlockEditor from "./blocks/VideoBlockEditor";
import AudioBlockEditor from "./blocks/AudioBlockEditor";
import ReadingBlockEditor from "./blocks/ReadingBlockEditor";
import QuizBlockEditor from "./blocks/QuizBlockEditor";
import AssignmentBlockEditor from "./blocks/AssignmentBlockEditor";
import FlashcardsBlockEditor from "./blocks/FlashcardsBlockEditor";
import DownloadBlockEditor from "./blocks/DownloadBlockEditor";
import EmbedBlockEditor from "./blocks/EmbedBlockEditor";
import LiveSessionBlockEditor from "./blocks/LiveSessionBlockEditor";
import RichTextBlockEditor from "./blocks/RichTextBlockEditor";
import HtmlCodeBlockEditor from "./blocks/HtmlCodeBlockEditor";
import {
  TextInput,
  TextArea,
  Select,
  SectionLabel,
  PrimaryButton,
  GhostButton,
} from "./settings/primitives";

// Batch 7 (G10) — legacy lesson-authoring consolidation.
//
// Before this, this modal opened on a "Choose a lesson type" step (10 types, including the
// confirmed non-functional "Code sandbox" and "SCORM" shims) whenever a lesson had no linked
// canvas (Lesson Builder) page. Real audit (2026-09-02): that step was ALREADY unreachable in
// every live path — every real caller of this modal (onEditLesson's fallback,
// handleCreateAssignment's "add an assignment block" shortcut) always passes an existing
// `editingLesson`, and every real lesson in the live database is canvas-authored
// (`lesson_type: 'text'`, a linked `pages` row) — so `onEditLesson` never actually falls
// through to this modal at all today; only `handleCreateAssignment` does, to open the real
// content-blocks editor below on an existing lesson. New lessons are created exclusively via
// AddLessonNameModal -> the canvas builder (always `lesson_type: 'text'`, a `pages` row created
// up front) — there is no live path left that creates a lesson of any other type.
//
// This modal is kept ONLY for what's still real and reachable: the Content Blocks panel
// (ContentBlockList — the actual, current authoring system) on an existing lesson, plus
// its title/access/unlock/time-estimate settings and the AI lesson-summary control. The
// type-picker, and every type-specific panel it used to gate (video/audio/PDF/SCORM asset
// URL, SCORM version, Code sandbox, Live Session schedule, the legacy flashcards deck — all
// superseded by real content_blocks types authored below) have been removed, not hidden.
function renderBlockTypeEditor(
  courseId: string,
  block: ContentBlock,
  onChange: (patch: Partial<ContentBlock>) => void
) {
  switch (block.type) {
    case "video":
      return <VideoBlockEditor block={block} onChange={onChange} />;
    case "audio":
      return <AudioBlockEditor block={block} onChange={onChange} />;
    case "rich_text":
      return <RichTextBlockEditor block={block} onChange={onChange} />;
    case "reading":
    case "slides":
      return <ReadingBlockEditor block={block} onChange={onChange} />;
    case "quiz":
      return <QuizBlockEditor block={block} courseId={courseId} />;
    case "assignment":
      return <AssignmentBlockEditor block={block} onChange={onChange} />;
    case "flashcards":
      return <FlashcardsBlockEditor block={block} onChange={onChange} />;
    case "download":
      return <DownloadBlockEditor block={block} onChange={onChange} />;
    case "embed":
      return <EmbedBlockEditor block={block} onChange={onChange} />;
    case "html_code":
      return <HtmlCodeBlockEditor block={block} onChange={onChange} />;
    case "live_session":
      return <LiveSessionBlockEditor block={block} onChange={onChange} />;
    default:
      return null;
  }
}

interface LessonCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lessonData: any) => Promise<void>;
  moduleId: string;
  courseId: string;
  editingLesson?: any;
}

/* Stacked label + control for the config form. */
function LField({
  label,
  hint,
  htmlFor,
  required,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[12px] font-semibold text-dash-text">
        {label}
        {required && <span className="ml-0.5 text-sky-600">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] leading-relaxed text-dash-textMuted">{hint}</p>}
    </div>
  );
}

function Panel({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl border border-dash-border bg-dash-surface/50 p-4">
      {label && <SectionLabel>{label}</SectionLabel>}
      {children}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-3 text-[12px] leading-relaxed text-amber-800 [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0">
      {children}
    </div>
  );
}

export default function LessonCreatorModal({
  isOpen,
  onClose,
  onSave,
  moduleId,
  courseId,
  editingLesson,
}: LessonCreatorModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [accessLevel, setAccessLevel] = useState<"public" | "enrolled" | "paid">("enrolled");
  const [timeEstimateMinutes, setTimeEstimateMinutes] = useState<string>("");
  const [unlockType, setUnlockType] = useState<"sequential" | "immediate" | "drip" | "quiz_gated">(
    "sequential"
  );
  const [dripValue, setDripValue] = useState<string>("");

  const [isSaving, setIsSaving] = useState(false);
  const [isRegeneratingSummary, setIsRegeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const handleRegenerateSummary = async () => {
    if (!editingLesson?.id) return;
    setIsRegeneratingSummary(true);
    setSummaryError(null);
    try {
      const res = await fetch(`/api/lms/lesson-summary?lessonId=${editingLesson.id}`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to regenerate summary");
      toast.success("Lesson summary regenerated");
    } catch (err: any) {
      setSummaryError(err.message || "Something went wrong");
      toast.error(err.message || "Failed to regenerate summary");
    } finally {
      setIsRegeneratingSummary(false);
    }
  };

  useEffect(() => {
    setSummaryError(null);
    if (editingLesson) {
      setTitle(editingLesson.title || "");
      setContent(editingLesson.content || "");
      setAccessLevel(editingLesson.access_level || (editingLesson.is_free ? "public" : "enrolled"));
      setTimeEstimateMinutes(
        editingLesson.time_estimate_minutes !== null &&
          editingLesson.time_estimate_minutes !== undefined
          ? String(editingLesson.time_estimate_minutes)
          : ""
      );
      setUnlockType(editingLesson.unlock_type || "sequential");
      setDripValue(
        editingLesson.drip_value !== null && editingLesson.drip_value !== undefined
          ? String(editingLesson.drip_value)
          : ""
      );
    } else {
      setTitle("");
      setContent("");
      setAccessLevel("enrolled");
      setTimeEstimateMinutes("");
      setUnlockType("sequential");
      setDripValue("");
    }
  }, [editingLesson, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || title.trim() === "") {
      toast.error("Lesson title is required");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        id: editingLesson?.id,
        module_id: moduleId,
        title,
        video_url: "",
        content,
        is_free: accessLevel === "public",
        access_level: accessLevel,
        time_estimate_minutes:
          timeEstimateMinutes.trim() === "" ? null : parseInt(timeEstimateMinutes, 10),
        unlock_type: unlockType,
        drip_value: dripValue.trim() === "" ? null : parseInt(dripValue, 10),
        type: "Text",
        metadata: {},
      });
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save lesson");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-start justify-center overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="my-auto flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-dash-border bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.35)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-dash-border px-6 py-5">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-500/15 [&_svg]:size-4">
              <BookOpen />
            </span>
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600">
                Lesson
              </div>
              <h2 className="font-display text-[17px] font-semibold leading-tight tracking-[-0.01em] text-dash-text">
                {editingLesson ? "Edit lesson" : "New lesson"}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-dash-textMuted transition-colors hover:bg-dash-surface hover:text-dash-text"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
            <LField label="Lesson title" htmlFor="lc-title" required>
              <TextInput
                id="lc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Setting up the payment webhook"
                required
              />
            </LField>

            <Panel label="Content blocks">
              {editingLesson?.id ? (
                <ContentBlockList
                  lessonId={editingLesson.id}
                  renderBlockEditor={(block, onChange) =>
                    renderBlockTypeEditor(courseId, block, onChange)
                  }
                />
              ) : (
                <Notice>
                  <AlertTriangle />
                  Save the lesson first, then add content blocks.
                </Notice>
              )}
            </Panel>

            <Panel label="Access">
              <LField
                label="Visibility"
                hint={
                  accessLevel === "public"
                    ? "Good for SEO, crawlers and course previews."
                    : accessLevel === "enrolled"
                    ? "Requires a login. Free for anyone who registers."
                    : "Locked until paid enrolment is verified."
                }
              >
                <Select
                  value={accessLevel}
                  onChange={(e) => setAccessLevel(e.target.value as any)}
                >
                  <option value="public">🔓 Public — no login needed</option>
                  <option value="enrolled">👥 Free for enrolled — login required</option>
                  <option value="paid">💳 Paid only — behind paid enrolment</option>
                </Select>
              </LField>
            </Panel>

            <LField label="Time estimate" hint="Shown in the student sidebar.">
              <TextInput
                type="number"
                min={0}
                value={timeEstimateMinutes}
                onChange={(e) => setTimeEstimateMinutes(e.target.value)}
                placeholder="Minutes"
                className="max-w-[220px] font-mono"
              />
            </LField>

            <Panel label="Unlock condition">
              <Select value={unlockType} onChange={(e) => setUnlockType(e.target.value as any)}>
                <option value="sequential">Sequential — after the previous lesson</option>
                <option value="immediate">Immediate — no lock</option>
                <option value="drip">Drip — days after unlock</option>
                <option value="quiz_gated">Quiz-gated — previous quiz passed</option>
              </Select>
              {unlockType === "drip" && (
                <LField label="Drip delay (days)">
                  <TextInput
                    type="number"
                    min={0}
                    value={dripValue}
                    onChange={(e) => setDripValue(e.target.value)}
                    placeholder="0 = immediately once unlocked"
                    className="max-w-[260px] font-mono"
                  />
                </LField>
              )}
            </Panel>

            <LField label="Lesson body (fallback text)" hint="Shown only if the lesson has no content blocks yet.">
              <TextArea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Explain the lesson or add guidelines…"
                rows={5}
                className="font-mono text-[12px] leading-relaxed"
              />
            </LField>

            {editingLesson?.id && (
              <Panel label="AI lesson summary">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[12px] leading-relaxed text-dash-textMuted">
                    Regenerated automatically on save. Force a fresh one now:
                  </p>
                  <GhostButton
                    type="button"
                    onClick={handleRegenerateSummary}
                    disabled={isRegeneratingSummary}
                    className="h-9 shrink-0 px-3 text-[12px]"
                  >
                    {isRegeneratingSummary ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Sparkles className="text-sky-500" />
                    )}
                    Regenerate
                  </GhostButton>
                </div>
                {summaryError && (
                  <p className="flex items-center gap-1.5 text-[11px] text-rose-600">
                    <AlertCircle size={12} className="shrink-0" /> {summaryError}
                  </p>
                )}
              </Panel>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-dash-border bg-dash-surface/60 px-6 py-4">
            <GhostButton type="button" onClick={onClose} disabled={isSaving}>
              Cancel
            </GhostButton>
            <PrimaryButton type="submit" loading={isSaving}>
              {isSaving ? "Saving…" : editingLesson ? "Save lesson" : "Create lesson"}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
