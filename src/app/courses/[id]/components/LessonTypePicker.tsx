"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  BookOpen,
  PlayCircle,
  HelpCircle,
  FileEdit,
  FileText,
  Headphones,
  Video,
  Layers,
  Code,
  Archive,
  ArrowRight,
} from "lucide-react";
import { PrimaryButton, GhostButton } from "./settings/primitives";
import { cn } from "@/lib/utils";

interface LessonTypePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (lessonType: string) => void;
}

const LESSON_TYPES = [
  { type: "text", label: "Text", desc: "Rich text + images", icon: BookOpen },
  { type: "video", label: "Video", desc: "Upload or embed", icon: PlayCircle },
  { type: "quiz", label: "Quiz", desc: "8 question types", icon: HelpCircle },
  { type: "assignment", label: "Assignment", desc: "File or text submit", icon: FileEdit },
  { type: "pdf", label: "PDF", desc: "In-browser viewer", icon: FileText },
  { type: "audio", label: "Audio", desc: "MP3 + transcript", icon: Headphones },
  { type: "live_session", label: "Live session", desc: "Meet or Zoom", icon: Video },
  { type: "flashcards", label: "Flashcards", desc: "Spaced repetition", icon: Layers },
  { type: "code", label: "Code", desc: "In-browser IDE", icon: Code },
  { type: "scorm", label: "SCORM", desc: "1.2 + 2004 standard", icon: Archive },
];

export default function LessonTypePicker({ isOpen, onClose, onSelect }: LessonTypePickerProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedType) {
      onSelect(selectedType);
      setSelectedType(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-start justify-center overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="my-auto flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-dash-border bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.35)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-dash-border px-6 py-5">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600">
              Lesson
            </div>
            <h2 className="font-display text-[17px] font-semibold leading-tight tracking-[-0.01em] text-dash-text">
              Choose a lesson type
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

        {/* Grid */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {LESSON_TYPES.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedType === item.type;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setSelectedType(item.type)}
                  aria-pressed={isSelected}
                  className={cn(
                    "group flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all outline-none focus-visible:ring-4 focus-visible:ring-sky-500/20",
                    isSelected
                      ? "border-sky-500 bg-sky-50/60 ring-1 ring-inset ring-sky-500/30"
                      : "border-dash-border bg-white hover:border-slate-300 hover:bg-dash-surface/50"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors [&_svg]:size-[18px]",
                      isSelected
                        ? "border-sky-200 bg-white text-sky-600"
                        : "border-dash-border bg-dash-surface text-dash-textMuted group-hover:text-dash-text"
                    )}
                  >
                    <Icon />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "text-[13px] font-semibold",
                          isSelected ? "text-sky-700" : "text-dash-text"
                        )}
                      >
                        {item.label}
                      </span>
                      <span
                        className={cn(
                          "ml-auto h-3.5 w-3.5 shrink-0 rounded-full border-2 transition-colors",
                          isSelected ? "border-sky-500 bg-sky-500" : "border-slate-300 bg-white"
                        )}
                      />
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

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-dash-border bg-dash-surface/60 px-6 py-4">
          <span className="text-[12px] text-dash-textMuted">
            {selectedType
              ? `${LESSON_TYPES.find((t) => t.type === selectedType)?.label} selected`
              : "Pick a type to continue"}
          </span>
          <div className="flex items-center gap-2">
            <GhostButton type="button" onClick={onClose}>
              Cancel
            </GhostButton>
            <PrimaryButton type="button" onClick={handleConfirm} disabled={!selectedType}>
              Next <ArrowRight />
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
