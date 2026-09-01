"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Loader2,
  X,
  ArrowLeft,
  BookOpen,
  PlayCircle,
  CheckSquare,
  FileEdit,
  FileText,
  Headphones,
  Video,
  Layers,
  Code,
  Archive,
  Plus,
  Trash2,
  AlertTriangle,
  Sparkles,
  AlertCircle,
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
import { cn } from "@/lib/utils";

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

const LESSON_TYPES = [
  { type: "Text", label: "Rich text", desc: "Article layout with markdown", icon: BookOpen },
  { type: "Video", label: "Video", desc: "MP4, YouTube or Vimeo", icon: PlayCircle },
  { type: "Quiz", label: "Quiz", desc: "Customisable question types", icon: CheckSquare },
  { type: "Assignment", label: "Assignment", desc: "File or text submissions", icon: FileEdit },
  { type: "PDF", label: "PDF", desc: "Slides, books, documents", icon: FileText },
  { type: "Audio", label: "Audio", desc: "Podcasts and recordings", icon: Headphones },
  { type: "Live Session", label: "Live session", desc: "Zoom, Teams or Meet", icon: Video },
  { type: "Flashcards", label: "Flashcards", desc: "Flippable active recall", icon: Layers },
  { type: "Code", label: "Code sandbox", desc: "In-browser code editor", icon: Code },
  { type: "SCORM", label: "SCORM", desc: "1.2 and 2004 packages", icon: Archive },
];

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

function Notice({
  tone = "amber",
  children,
}: {
  tone?: "amber" | "sky" | "rose";
  children: React.ReactNode;
}) {
  const map = {
    amber: "border-amber-200 bg-amber-50/70 text-amber-800",
    sky: "border-sky-200 bg-sky-50/70 text-sky-800",
    rose: "border-rose-200 bg-rose-50/70 text-rose-800",
  } as const;
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[12px] leading-relaxed [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0",
        map[tone]
      )}
    >
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
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState("Text");
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [content, setContent] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [accessLevel, setAccessLevel] = useState<"public" | "enrolled" | "paid">("enrolled");
  const [timeEstimateMinutes, setTimeEstimateMinutes] = useState<string>("");
  const [unlockType, setUnlockType] = useState<"sequential" | "immediate" | "drip" | "quiz_gated">(
    "sequential"
  );
  const [dripValue, setDripValue] = useState<string>("");

  const [flashcards, setFlashcards] = useState<{ front: string; back: string }[]>([]);
  const [codeLanguage, setCodeLanguage] = useState("javascript");
  const [starterCode, setStarterCode] = useState("");
  const [scormVersion, setScormVersion] = useState("scorm12");
  const [startTime, setStartTime] = useState("");
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isRegeneratingSummary, setIsRegeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingType(fileType);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("pathPrefix", `lms/${fileType}`);

    try {
      const res = await fetch("/api/lms/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) {
        toast.error(`Upload failed: ${data.error}`);
      } else {
        setVideoUrl(data.url);
        toast.success(`${fileType.toUpperCase()} file uploaded successfully!`);
      }
    } catch {
      toast.error("Network error uploading file");
    } finally {
      setUploadingType(null);
    }
  };

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
      setVideoUrl(editingLesson.video_url || "");
      setContent(editingLesson.content || "");
      setIsFree(editingLesson.is_free || false);
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
      setType(editingLesson.type || "Text");

      const meta = editingLesson.metadata || {};
      setFlashcards(meta.flashcards || []);
      setCodeLanguage(meta.codeLanguage || "javascript");
      setStarterCode(meta.starterCode || "");
      setScormVersion(meta.scormVersion || "scorm12");
      setStartTime(meta.startTime || "");

      // Three Deferred Items, Item 3 — the "Quiz" lesson-type branch here (fetchOrCreateQuiz,
      // reading/writing the legacy lms_quizzes table) was removed: confirmed unreachable via
      // the real, live edit flow. CourseWorkspaceClient's onEditLesson intercepts
      // les.type === "Quiz" and routes straight to the real Quiz Workbench before this modal
      // ever opens, so editingLesson.type could never actually be "Quiz" here.

      setStep(2);
    } else {
      setTitle("");
      setVideoUrl("");
      setContent("");
      setIsFree(false);
      setAccessLevel("enrolled");
      setTimeEstimateMinutes("");
      setUnlockType("sequential");
      setDripValue("");
      setType("Text");
      setFlashcards([]);
      setCodeLanguage("javascript");
      setStarterCode("");
      setScormVersion("scorm12");
      setStartTime("");
      setStep(1);
    }
  }, [editingLesson, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectType = (selectedType: string) => {
    setType(selectedType);
    setStep(2);
  };

  const handleAddFlashcard = () => setFlashcards([...flashcards, { front: "", back: "" }]);
  const handleRemoveFlashcard = (idx: number) =>
    setFlashcards(flashcards.filter((_, i) => i !== idx));
  const handleFlashcardChange = (idx: number, side: "front" | "back", val: string) => {
    const updated = [...flashcards];
    updated[idx][side] = val;
    setFlashcards(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || title.trim() === "") {
      toast.error("Lesson title is required");
      return;
    }

    setIsSaving(true);

    const metadata: any = {};
    if (type === "Flashcards") {
      metadata.flashcards = flashcards;
    } else if (type === "Code") {
      metadata.codeLanguage = codeLanguage;
      metadata.starterCode = starterCode;
    } else if (type === "SCORM") {
      metadata.scormVersion = scormVersion;
    } else if (type === "Live Session") {
      metadata.startTime = startTime;
    }

    try {
      await onSave({
        id: editingLesson?.id,
        module_id: moduleId,
        title,
        video_url: videoUrl,
        content,
        is_free: accessLevel === "public",
        access_level: accessLevel,
        time_estimate_minutes:
          timeEstimateMinutes.trim() === "" ? null : parseInt(timeEstimateMinutes, 10),
        unlock_type: unlockType,
        drip_value: dripValue.trim() === "" ? null : parseInt(dripValue, 10),
        type,
        metadata,
      });
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save lesson");
    } finally {
      setIsSaving(false);
    }
  };

  const activeTypeInfo = LESSON_TYPES.find((t) => t.type === type) || LESSON_TYPES[0];
  const TypeIcon = activeTypeInfo.icon;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-start justify-center overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="my-auto flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-dash-border bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.35)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-dash-border px-6 py-5">
          <div className="flex items-start gap-3">
            {step === 2 && (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-500/15 [&_svg]:size-4">
                <TypeIcon />
              </span>
            )}
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600">
                Lesson
              </div>
              <h2 className="font-display text-[17px] font-semibold leading-tight tracking-[-0.01em] text-dash-text">
                {step === 1
                  ? "Choose a lesson type"
                  : `${editingLesson ? "Edit" : "New"} ${activeTypeInfo.label.toLowerCase()} lesson`}
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

        {/* Step 1 */}
        {step === 1 && (
          <div className="max-h-[62vh] overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {LESSON_TYPES.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => handleSelectType(item.type)}
                    className="group flex items-start gap-3.5 rounded-xl border border-dash-border bg-white p-4 text-left transition-all outline-none hover:border-slate-300 hover:bg-dash-surface/50 focus-visible:ring-4 focus-visible:ring-sky-500/20"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dash-border bg-dash-surface text-dash-textMuted transition-colors group-hover:border-sky-200 group-hover:bg-sky-50 group-hover:text-sky-600 [&_svg]:size-[18px]">
                      <Icon />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-dash-text group-hover:text-sky-700">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-relaxed text-dash-textMuted">
                        {item.desc}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
              {!editingLesson && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-sky-600 transition-colors hover:text-sky-700"
                >
                  <ArrowLeft size={14} /> Back to lesson types
                </button>
              )}

              <LField label="Lesson title" htmlFor="lc-title" required>
                <TextInput
                  id="lc-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Setting up the payment webhook"
                  required
                />
              </LField>

              {["Video", "Audio", "Live Session", "PDF", "SCORM"].includes(type) && (
                <LField
                  label={type === "Live Session" ? "Meeting URL" : `${type} asset URL`}
                >
                  <div className="flex gap-2">
                    <TextInput
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder={`https://example.com/assets/${type.toLowerCase()}`}
                      className="flex-1 font-mono text-[12px]"
                      required
                    />
                    {["Video", "Audio", "PDF", "SCORM"].includes(type) && (
                      <div className="relative shrink-0">
                        <input
                          type="file"
                          accept={
                            type === "Video"
                              ? "video/*"
                              : type === "Audio"
                              ? "audio/*"
                              : type === "PDF"
                              ? "application/pdf"
                              : ".zip"
                          }
                          onChange={(e) => handleFileUpload(e, type.toLowerCase())}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          disabled={uploadingType !== null}
                        />
                        <GhostButton type="button" disabled={uploadingType !== null}>
                          {uploadingType === type.toLowerCase() ? "Uploading…" : "Upload"}
                        </GhostButton>
                      </div>
                    )}
                  </div>
                </LField>
              )}

              {type === "SCORM" && (
                <Panel label="SCORM version">
                  <Select value={scormVersion} onChange={(e) => setScormVersion(e.target.value)}>
                    <option value="scorm12">SCORM 1.2</option>
                    <option value="scorm2004">SCORM 2004</option>
                  </Select>
                </Panel>
              )}

              {type === "Live Session" && (
                <Panel label="Schedule">
                  <LField label="Start date & time" required>
                    <TextInput
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </LField>
                </Panel>
              )}

              {type === "Code" && (
                <Panel label="Code sandbox">
                  <LField label="Language">
                    <Select
                      value={codeLanguage}
                      onChange={(e) => setCodeLanguage(e.target.value)}
                      className="max-w-[220px]"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="typescript">TypeScript</option>
                      <option value="python">Python</option>
                      <option value="html">HTML / XML</option>
                      <option value="css">CSS</option>
                    </Select>
                  </LField>
                  <LField label="Starter code">
                    <TextArea
                      value={starterCode}
                      onChange={(e) => setStarterCode(e.target.value)}
                      rows={4}
                      placeholder="// Starter template…"
                      className="font-mono text-[12px]"
                    />
                  </LField>
                </Panel>
              )}

              {type === "Flashcards" && (
                <Panel label="Flashcard deck">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-dash-textMuted">
                      {flashcards.length} {flashcards.length === 1 ? "card" : "cards"}
                    </span>
                    <button
                      type="button"
                      onClick={handleAddFlashcard}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-sky-600 transition-colors hover:text-sky-700"
                    >
                      <Plus size={13} /> Add card
                    </button>
                  </div>
                  {flashcards.length === 0 ? (
                    <p className="py-4 text-center text-[12px] text-dash-textMuted">
                      No cards yet.
                    </p>
                  ) : (
                    <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                      {flashcards.map((card, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 rounded-lg border border-dash-border bg-white p-2.5"
                        >
                          <TextInput
                            value={card.front}
                            onChange={(e) => handleFlashcardChange(idx, "front", e.target.value)}
                            placeholder="Front"
                            className="h-9 flex-1 text-[12px]"
                            required
                          />
                          <TextInput
                            value={card.back}
                            onChange={(e) => handleFlashcardChange(idx, "back", e.target.value)}
                            placeholder="Back"
                            className="h-9 flex-1 text-[12px]"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveFlashcard(idx)}
                            className="shrink-0 rounded-md p-1.5 text-dash-textMuted transition-colors hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              )}

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

              <LField
                label={type === "Text" ? "Lesson body (markdown)" : `${type} instructions`}
              >
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
        )}
      </div>
    </div>
  );
}
