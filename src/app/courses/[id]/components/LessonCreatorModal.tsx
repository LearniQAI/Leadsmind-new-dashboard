"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { 
  Loader2, X, ArrowLeft, BookOpen, PlayCircle, 
  CheckSquare, FileEdit, FileText, Headphones, 
  Video, Layers, Code, Archive, Plus, Trash2,
  AlertTriangle, Settings
} from "lucide-react";
import { getLessonQuiz, upsertQuiz } from "@/app/actions/quizzes";

interface LessonCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lessonData: any) => Promise<void>;
  moduleId: string;
  courseId: string;
  editingLesson?: any;
}

const LESSON_TYPES = [
  { type: "Text", label: "Rich Text Lecture", desc: "Standard text article layout with markdown support", icon: BookOpen },
  { type: "Video", label: "Video streaming Node", desc: "Embed and stream MP4 files, YouTube, or Vimeo links", icon: PlayCircle },
  { type: "Quiz", label: "Interactive Quiz", desc: "Test student mastery with customizable question structures", icon: CheckSquare },
  { type: "Assignment", label: "Student Assignment", desc: "Require document uploads or text submissions for grading", icon: FileEdit },
  { type: "PDF", label: "PDF Document Frame", desc: "Embed slides, textbooks, or compliance documents", icon: FileText },
  { type: "Audio", label: "Audio Lecture Node", desc: "Host podcasts, recordings, or speech elements", icon: Headphones },
  { type: "Live Session", label: "Live Broadcast", desc: "Integrate Zoom, Teams, or Google Meet links", icon: Video },
  { type: "Flashcards", label: "Interactive Deck", desc: "Flippable active-recall study flashcard card systems", icon: Layers },
  { type: "Code", label: "Monaco Code Sandbox", desc: "A code editor terminal for standard coding execution", icon: Code },
  { type: "SCORM", label: "SCORM Course compliance", desc: "Upload standard industry compliant SCORM zip packages", icon: Archive }
];

export default function LessonCreatorModal({
  isOpen,
  onClose,
  onSave,
  moduleId,
  courseId,
  editingLesson
}: LessonCreatorModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState("Text");
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [content, setContent] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [accessLevel, setAccessLevel] = useState<'public' | 'enrolled' | 'paid'>('enrolled');
  
  // Type-specific Metadata states
  const [flashcards, setFlashcards] = useState<{ front: string; back: string }[]>([]);
  const [codeLanguage, setCodeLanguage] = useState("javascript");
  const [starterCode, setStarterCode] = useState("");
  const [scormVersion, setScormVersion] = useState("scorm12");
  const [startTime, setStartTime] = useState("");
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingType(fileType);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('pathPrefix', `lms/${fileType}`);

    try {
      const res = await fetch('/api/lms/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.error) {
        toast.error(`Upload failed: ${data.error}`);
      } else {
        setVideoUrl(data.url);
        toast.success(`${fileType.toUpperCase()} file uploaded successfully!`);
      }
    } catch {
      toast.error('Network error uploading file');
    } finally {
      setUploadingType(null);
    }
  };

  const fetchOrCreateQuiz = async (lesId: string, lesTitle: string) => {
    setIsLoadingQuiz(true);
    const res = await getLessonQuiz(lesId);
    if (res.error) {
      console.error("Quiz lookup failed:", res.error);
      toast.error(`Quiz lookup failed: ${res.error}`);
    }
    if (res.data) {
      setQuizId(res.data.id);
    } else {
      const quizRes = await upsertQuiz({
        lesson_id: lesId,
        title: lesTitle || "Lesson Quiz",
        passing_score: 80,
        course_id: courseId,
        module_id: moduleId
      });
      if (quizRes.error) {
        console.error("Quiz creation failed:", quizRes.error);
        toast.error(`Failed to initialize quiz: ${quizRes.error}`);
      }
      if (quizRes.data) {
        setQuizId(quizRes.data.id);
      }
    }
    setIsLoadingQuiz(false);
  };

  useEffect(() => {
    if (editingLesson) {
      setTitle(editingLesson.title || "");
      setVideoUrl(editingLesson.video_url || "");
      setContent(editingLesson.content || "");
      setIsFree(editingLesson.is_free || false);
      setAccessLevel(editingLesson.access_level || (editingLesson.is_free ? 'public' : 'enrolled'));
      setType(editingLesson.type || "Text");
      
      const meta = editingLesson.metadata || {};
      setFlashcards(meta.flashcards || []);
      setCodeLanguage(meta.codeLanguage || "javascript");
      setStarterCode(meta.starterCode || "");
      setScormVersion(meta.scormVersion || "scorm12");
      setStartTime(meta.startTime || "");
      
      if (editingLesson.type === "Quiz") {
        fetchOrCreateQuiz(editingLesson.id, editingLesson.title || "");
      }
      
      setStep(2); // Directly go to editor form when editing
    } else {
      setTitle("");
      setVideoUrl("");
      setContent("");
      setIsFree(false);
      setAccessLevel('enrolled');
      setType("Text");
      setFlashcards([]);
      setCodeLanguage("javascript");
      setStarterCode("");
      setScormVersion("scorm12");
      setStartTime("");
      setQuizId(null);
      setStep(1); // Selection wizard first
    }
  }, [editingLesson, isOpen]);

  if (!isOpen) return null;

  const handleSelectType = (selectedType: string) => {
    setType(selectedType);
    setStep(2);
  };

  const handleAddFlashcard = () => {
    setFlashcards([...flashcards, { front: "", back: "" }]);
  };

  const handleRemoveFlashcard = (idx: number) => {
    setFlashcards(flashcards.filter((_, i) => i !== idx));
  };

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
    
    // Package type metadata
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
        is_free: accessLevel === 'public',
        access_level: accessLevel,
        type,
        metadata
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
      <div className="bg-white border border-dash-border rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl relative flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dash-border">
          <div className="flex items-center gap-2">
            {step === 2 && <TypeIcon className="text-dash-accent" size={18} />}
            <h2 className="text-sm font-bold !text-dash-text">
              {step === 1 ? "Select Lecture Format Layout" : `${editingLesson ? "Edit" : "Create"} ${type} Lesson`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="!text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step 1: Type Selection Panel */}
        {step === 1 && (
          <div className="p-6 space-y-4">
            <p className="text-[10px] !text-dash-textMuted font-bold">
              Choose a template mapping structure
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-1">
              {LESSON_TYPES.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.type}
                    onClick={() => handleSelectType(item.type)}
                    className="bg-dash-surface border border-dash-border hover:border-dash-accent/40 rounded-xl p-4 cursor-pointer hover:bg-dash-border/30 transition-all motion-reduce:transition-none flex items-start gap-3 group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-dash-accent/10 border border-dash-accent/20 flex items-center justify-center text-dash-accent shrink-0 group-hover:bg-dash-accent group-hover:text-white transition-all motion-reduce:transition-none">
                      <Icon size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-bold !text-dash-text block group-hover:text-dash-accent transition-colors motion-reduce:transition-none">
                        {item.label}
                      </span>
                      <span className="text-[10px] !text-dash-textMuted block mt-0.5 leading-relaxed">
                        {item.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Form Configurations */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1">
            {/* Back button to Step 1 (only show when creating new) */}
            {!editingLesson && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-[10px] font-bold text-primary hover:opacity-80 mb-2 transition-opacity motion-reduce:transition-none"
              >
                <ArrowLeft size={12} /> Back to formats selection
              </button>
            )}

            {/* Lesson Title */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold !text-dash-textMuted block">
                Lesson Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Setting up the payfast hook endpoint"
                className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 text-sm !text-dash-text placeholder:!text-dash-textMuted outline-none focus:border-primary transition-all motion-reduce:transition-none"
                required
              />
            </div>

            {/* Video / Audio / Live / PDF / SCORM URL Input */}
            {["Video", "Audio", "Live Session", "PDF", "SCORM"].includes(type) && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold !text-dash-textMuted block">
                  {type === "Live Session" ? "Broadcast Stream Meeting URL" : `${type} Asset URL`}
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder={`https://example.com/assets/${type.toLowerCase()}`}
                    className="flex-1 bg-white border border-dash-border rounded-xl px-4 py-3 text-xs !text-dash-text placeholder:!text-dash-textMuted outline-none focus:border-primary transition-all motion-reduce:transition-none font-mono"
                    required
                  />
                  {["Video", "Audio", "PDF", "SCORM"].includes(type) && (
                    <div className="relative shrink-0">
                      <input
                        type="file"
                        accept={
                          type === "Video" ? "video/*" :
                          type === "Audio" ? "audio/*" :
                          type === "PDF" ? "application/pdf" :
                          ".zip"
                        }
                        onChange={(e) => handleFileUpload(e, type.toLowerCase())}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        disabled={uploadingType !== null}
                      />
                      <Button
                        type="button"
                        disabled={uploadingType !== null}
                        className="h-full bg-dash-surface border border-dash-border hover:bg-dash-border/60 !text-dash-text text-[10px] font-bold px-4 rounded-xl flex items-center gap-1.5 transition-colors motion-reduce:transition-none"
                      >
                        {uploadingType === type.toLowerCase() ? "Uploading..." : "Upload File"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SCORM Config Parameters */}
            {type === "SCORM" && (
              <div className="space-y-2 bg-dash-surface border border-dash-border rounded-xl p-4">
                <label className="text-[10px] font-bold !text-dash-textMuted block">
                  SCORM Standards Version Compliance
                </label>
                <select
                  value={scormVersion}
                  onChange={(e) => setScormVersion(e.target.value)}
                  className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 text-xs !text-dash-text outline-none focus:border-primary"
                >
                  <option value="scorm12">SCORM 1.2 standard</option>
                  <option value="scorm2004">SCORM 2004 standard</option>
                </select>
              </div>
            )}

            {/* Live Session Scheduling Parameters */}
            {type === "Live Session" && (
              <div className="space-y-2 bg-dash-surface border border-dash-border rounded-xl p-4">
                <label className="text-[10px] font-bold !text-dash-textMuted block">
                  Broadcast Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 text-xs !text-dash-text outline-none focus:border-primary"
                  required
                />
              </div>
            )}

            {/* Code editor inputs */}
            {type === "Code" && (
              <div className="grid grid-cols-1 gap-4 bg-dash-surface border border-dash-border rounded-xl p-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold !text-dash-textMuted block">
                    Programming Language
                  </label>
                  <select
                    value={codeLanguage}
                    onChange={(e) => setCodeLanguage(e.target.value)}
                    className="bg-white border border-dash-border rounded-xl px-3 py-2 text-xs !text-dash-text outline-none focus:border-primary"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="html">HTML / XML</option>
                    <option value="css">CSS</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold !text-dash-textMuted block">
                    Starter Template Code
                  </label>
                  <textarea
                    value={starterCode}
                    onChange={(e) => setStarterCode(e.target.value)}
                    rows={4}
                    placeholder="// Write starter code challenge template here..."
                    className="w-full bg-white border border-dash-border rounded-xl px-3 py-2 text-xs !text-dash-text outline-none font-mono"
                  />
                </div>
              </div>
            )}

            {/* Flashcards System Builder */}
            {type === "Flashcards" && (
              <div className="bg-dash-surface border border-dash-border rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold !text-dash-textMuted">
                    Flashcard Deck System
                  </span>
                  <button
                    type="button"
                    onClick={handleAddFlashcard}
                    className="text-[10px] font-bold text-primary hover:opacity-80 flex items-center gap-1 transition-opacity motion-reduce:transition-none"
                  >
                    <Plus size={12} /> Add Card
                  </button>
                </div>
                {flashcards.length === 0 ? (
                  <div className="py-6 text-center text-[11px] !text-dash-textMuted font-medium">
                    No flashcards in this deck. Add cards to begin.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                    {flashcards.map((card, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white border border-dash-border p-3 rounded-lg">
                        <input
                          type="text"
                          value={card.front}
                          onChange={(e) => handleFlashcardChange(idx, "front", e.target.value)}
                          placeholder="Front Question"
                          className="flex-1 bg-dash-surface border border-dash-border rounded px-2 py-1 text-xs !text-dash-text outline-none"
                          required
                        />
                        <input
                          type="text"
                          value={card.back}
                          onChange={(e) => handleFlashcardChange(idx, "back", e.target.value)}
                          placeholder="Back Explanation"
                          className="flex-1 bg-dash-surface border border-dash-border rounded px-2 py-1 text-xs !text-dash-text outline-none"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveFlashcard(idx)}
                          className="text-red hover:text-red/80 transition-colors motion-reduce:transition-none"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Interactive Quiz Builder */}
            {type === "Quiz" && (
              <div className="bg-dash-surface border border-dash-border rounded-xl p-4 space-y-4">
                <span className="text-[10px] font-bold text-dash-accent block">Quiz Questions Workbench</span>
                {editingLesson ? (
                  isLoadingQuiz ? (
                    <div className="py-6 text-center text-xs !text-dash-textMuted flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin motion-reduce:animate-none" size={14} /> Loading Quiz Workbench...
                    </div>
                  ) : quizId ? (
                    <div className="py-6 px-4 text-center bg-white border border-dashed border-dash-border rounded-xl space-y-4">
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold !text-dash-text">Quiz Ready to Configure</h4>
                        <p className="text-[10px] !text-dash-textMuted max-w-sm mx-auto leading-relaxed">
                          Build evaluation questions, configure passing scores, time limits, and write LENA AI explanation rationales in the dedicated Quiz Workbench.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          onClose();
                          router.push(`/courses/${courseId}/quiz/${quizId}`);
                        }}
                        className="bg-primary hover:bg-primary/90 text-white rounded-xl text-[10px] font-bold h-10 px-5 shadow-lg shadow-primary/20 flex items-center gap-1.5 mx-auto transition-colors motion-reduce:transition-none"
                      >
                        <Settings size={12} /> Open Quiz Workbench
                      </Button>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs flex items-center justify-center gap-1.5 bg-white border border-dashed border-dash-border rounded-xl text-red">
                      Failed to initialize Quiz database record.
                    </div>
                  )
                ) : (
                  <div className="py-6 text-center text-xs !text-dash-textMuted flex items-center justify-center gap-1.5 bg-white border border-dashed border-dash-border rounded-xl">
                    <AlertTriangle size={14} className="text-amber-600" /> Please save the lesson first before building quiz questions.
                  </div>
                )}
              </div>
            )}

            {/* Access Level Selector */}
            <div className="space-y-2 bg-dash-surface border border-dash-border rounded-xl p-4">
              <label className="text-[10px] font-bold !text-dash-textMuted block">Access Control Visibility</label>
              <select
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value as any)}
                className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 text-xs !text-dash-text outline-none focus:border-primary transition-all motion-reduce:transition-none font-bold"
              >
                <option value="public">🔓 Public (Accessible without enrollment or login)</option>
                <option value="enrolled">👥 Free for Enrolled (Requires login & enrollment)</option>
                <option value="paid">💳 Paid Only (Locked behind paid enrollment verification)</option>
              </select>
              <p className="text-[8px] !text-dash-textMuted font-bold mt-1">
                {accessLevel === 'public' && "Perfect for SEO indexation, search web crawlers, and course previews."}
                {accessLevel === 'enrolled' && "Forces student registration. Free access for anyone who registers."}
                {accessLevel === 'paid' && "Hard-locked. Accessible only after confirming payment verification state."}
              </p>
            </div>

            {/* Content (Text description, Rich Text, etc.) */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold !text-dash-textMuted block">
                {type === "Text" ? "Lesson Rich Text (Markdown supported)" : `${type} Lesson Instructions / Body`}
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Explain lesson concepts or add learning guidelines..."
                rows={5}
                className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 text-xs !text-dash-text placeholder:!text-dash-textMuted outline-none focus:border-primary transition-all motion-reduce:transition-none font-mono leading-relaxed"
              />
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-dash-border">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isSaving}
                className="h-11 rounded-xl !text-dash-textMuted hover:bg-dash-surface text-[10px] font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-11 bg-primary hover:bg-primary/90 text-white rounded-xl text-[10px] font-bold px-6 shadow-lg shadow-primary/20 transition-colors motion-reduce:transition-none"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin motion-reduce:animate-none mr-2" /> Saving...
                  </>
                ) : (
                  "Save Lesson Node"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
