"use client";

import React, { useState } from "react";
import { X, BookOpen, PlayCircle, HelpCircle, FileEdit, FileText, Headphones, Video, Layers, Code, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  { type: "live_session", label: "Live Session", desc: "Meet or Zoom", icon: Video },
  { type: "flashcards", label: "Flashcards", desc: "Spaced repetition", icon: Layers },
  { type: "code", label: "Code", desc: "In-browser IDE", icon: Code },
  { type: "scorm", label: "SCORM", desc: "1.2 + 2004 standard", icon: Archive }
];

export default function LessonTypePicker({
  isOpen,
  onClose,
  onSelect
}: LessonTypePickerProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedType) {
      onSelect(selectedType);
      setSelectedType(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
      <div className="bg-white border border-dash-border rounded-xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl relative flex flex-col !text-dash-text">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-dash-border">
          <h2 className="text-base font-semibold">
            Select Lesson Type
          </h2>
          <button onClick={onClose} className="!text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none">
            <X size={18} />
          </button>
        </div>

        {/* Content - 2-Column Grid */}
        <div className="p-5 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LESSON_TYPES.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedType === item.type;
              return (
                <div
                  key={item.type}
                  onClick={() => setSelectedType(item.type)}
                  className={`border rounded-xl p-4 cursor-pointer transition-all motion-reduce:transition-none flex items-start gap-4 ${
                    isSelected
                      ? "border-dash-accent bg-dash-accent/10"
                      : "bg-white border-dash-border hover:border-dash-accent/40 hover:bg-dash-accent/5"
                  }`}
                >
                  <div className={`p-2.5 rounded-lg border transition-colors motion-reduce:transition-none ${
                    isSelected
                      ? "bg-dash-accent/20 border-dash-accent !text-dash-text"
                      : "bg-dash-surface border-dash-border !text-dash-textMuted"
                  }`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold !text-dash-text">{item.label}</h4>
                    <p className="text-xs !text-dash-textMuted mt-1">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-dash-border">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="rounded-lg !text-dash-textMuted hover:bg-dash-surface text-[10px] font-bold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedType}
            className="bg-dash-accent hover:bg-dash-accent/90 text-white rounded-lg text-[10px] font-bold px-5 transition-colors motion-reduce:transition-none"
          >
            Next
          </Button>
        </div>

      </div>
    </div>
  );
}
