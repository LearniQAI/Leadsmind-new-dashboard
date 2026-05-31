"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  Loader2, X, ArrowLeft, BookOpen, PlayCircle, 
  CheckSquare, FileEdit, FileText, Headphones, 
  Video, Layers, Code, Archive, Plus, Trash2 
} from "lucide-react";

interface LessonCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lessonData: any) => Promise<void>;
  moduleId: string;
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
  editingLesson
}: LessonCreatorModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState("Text");
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [content, setContent] = useState("");
  const [isFree, setIsFree] = useState(false);
  
  // Type-specific Metadata states
  const [flashcards, setFlashcards] = useState<{ front: string; back: string }[]>([]);
  const [codeLanguage, setCodeLanguage] = useState("javascript");
  const [starterCode, setStarterCode] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingLesson) {
      setTitle(editingLesson.title || "");
      setVideoUrl(editingLesson.video_url || "");
      setContent(editingLesson.content || "");
      setIsFree(editingLesson.is_free || false);
      setType(editingLesson.type || "Text");
      
      const meta = editingLesson.metadata || {};
      setFlashcards(meta.flashcards || []);
      setCodeLanguage(meta.codeLanguage || "javascript");
      setStarterCode(meta.starterCode || "");
      
      setStep(2); // Directly go to editor form when editing
    } else {
      setTitle("");
      setVideoUrl("");
      setContent("");
      setIsFree(false);
      setType("Text");
      setFlashcards([]);
      setCodeLanguage("javascript");
      setStarterCode("");
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
    }

    try {
      await onSave({
        id: editingLesson?.id,
        module_id: moduleId,
        title,
        video_url: videoUrl,
        content,
        is_free: isFree,
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
    <div className="fixed inset-0 bg-[#04091a]/85 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
      <div className="bg-[#080f28] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl relative flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            {step === 2 && <TypeIcon className="text-accent2" size={18} />}
            <h2 className="text-sm font-space-grotesk font-bold text-white uppercase tracking-tight">
              {step === 1 ? "Select Lecture Format Layout" : `${editingLesson ? "Edit" : "Create"} ${type} Lesson`}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step 1: Type Selection Panel */}
        {step === 1 && (
          <div className="p-6 space-y-4">
            <p className="text-[10px] text-t3 font-black uppercase tracking-widest">
              Choose a template mapping structure
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-1">
              {LESSON_TYPES.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.type}
                    onClick={() => handleSelectType(item.type)}
                    className="bg-[#111d47]/30 border border-white/5 hover:border-accent/40 rounded-xl p-4 cursor-pointer hover:bg-[#111d47]/50 transition-all flex items-start gap-3 group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent2 shrink-0 group-hover:bg-accent group-hover:text-white transition-all">
                      <Icon size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block group-hover:text-accent2 transition-colors">
                        {item.label}
                      </span>
                      <span className="text-[10px] text-white/40 block mt-0.5 leading-relaxed">
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
                className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary-light uppercase tracking-wider mb-2"
              >
                <ArrowLeft size={12} /> Back to formats selection
              </button>
            )}

            {/* Lesson Title */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block">
                Lesson Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Setting up the payfast hook endpoint"
                className="w-full bg-[#111d47] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-primary transition-all font-body"
                required
              />
            </div>

            {/* Video / Audio / Live / PDF / SCORM URL Input */}
            {["Video", "Audio", "Live Session", "PDF", "SCORM"].includes(type) && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block">
                  {type === "Live Session" ? "Broadcast Stream Meeting URL" : `${type} Asset URL`}
                </label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder={`https://example.com/assets/${type.toLowerCase()}`}
                  className="w-full bg-[#111d47] border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/20 outline-none focus:border-primary transition-all font-mono"
                  required
                />
              </div>
            )}

            {/* Code editor inputs */}
            {type === "Code" && (
              <div className="grid grid-cols-1 gap-4 bg-[#111d47]/20 border border-white/5 rounded-xl p-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block">
                    Programming Language
                  </label>
                  <select
                    value={codeLanguage}
                    onChange={(e) => setCodeLanguage(e.target.value)}
                    className="bg-[#111d47] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="html">HTML / XML</option>
                    <option value="css">CSS</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block">
                    Starter Template Code
                  </label>
                  <textarea
                    value={starterCode}
                    onChange={(e) => setStarterCode(e.target.value)}
                    rows={4}
                    placeholder="// Write starter code challenge template here..."
                    className="w-full bg-[#111d47] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                  />
                </div>
              </div>
            )}

            {/* Flashcards System Builder */}
            {type === "Flashcards" && (
              <div className="bg-[#111d47]/20 border border-white/5 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                    Flashcard Deck System
                  </span>
                  <button
                    type="button"
                    onClick={handleAddFlashcard}
                    className="text-[10px] font-black text-primary hover:text-primary-light flex items-center gap-1 uppercase tracking-wider"
                  >
                    <Plus size={12} /> Add Card
                  </button>
                </div>
                {flashcards.length === 0 ? (
                  <div className="py-6 text-center text-[11px] text-white/30 font-medium">
                    No flashcards in this deck. Add cards to begin.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                    {flashcards.map((card, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-[#111d47]/30 border border-white/5 p-3 rounded-lg">
                        <input
                          type="text"
                          value={card.front}
                          onChange={(e) => handleFlashcardChange(idx, "front", e.target.value)}
                          placeholder="Front Question"
                          className="flex-1 bg-[#111d47] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none"
                          required
                        />
                        <input
                          type="text"
                          value={card.back}
                          onChange={(e) => handleFlashcardChange(idx, "back", e.target.value)}
                          placeholder="Back Explanation"
                          className="flex-1 bg-[#111d47] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveFlashcard(idx)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Free Preview Switch */}
            <div className="flex items-center justify-between bg-[#111d47]/30 border border-white/5 rounded-xl p-4">
              <div>
                <span className="text-xs font-bold text-white block">Free Preview Available</span>
                <span className="text-[10px] text-white/40 block mt-0.5">Unregistered students can preview this lesson for free</span>
              </div>
              <Switch
                checked={isFree}
                onCheckedChange={setIsFree}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            {/* Content (Text description, Rich Text, etc.) */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block">
                {type === "Text" ? "Lesson Rich Text (Markdown supported)" : `${type} Lesson Instructions / Body`}
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Explain lesson concepts or add learning guidelines..."
                rows={5}
                className="w-full bg-[#111d47] border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/20 outline-none focus:border-primary transition-all font-mono leading-relaxed"
              />
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isSaving}
                className="h-11 rounded-xl text-white/60 hover:bg-white/5 uppercase tracking-wider text-[10px] font-black"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-11 bg-primary hover:bg-primary/90 text-white rounded-xl uppercase tracking-wider text-[10px] font-black px-6 shadow-lg shadow-primary/20"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-2" /> Saving...
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
