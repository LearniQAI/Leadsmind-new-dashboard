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
    <div className="fixed inset-0 bg-[#04091a]/75 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
      <div className="bg-[#080f28] border border-[rgba(255,255,255,0.07)] rounded-xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl relative flex flex-col text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[rgba(255,255,255,0.07)]">
          <h2 className="text-base font-semibold font-space-grotesk uppercase tracking-wide">
            Select Lesson Type
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
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
                  className={`border rounded-xl p-4 cursor-pointer transition-all flex items-start gap-4 ${
                    isSelected 
                      ? "border-[#6366f1] bg-[rgba(99,102,241,0.1)]" 
                      : "bg-[rgba(12,21,53,0.85)] border-[rgba(255,255,255,0.07)] hover:border-[rgba(99,102,241,0.4)] hover:bg-[rgba(99,102,241,0.06)]"
                  }`}
                >
                  <div className={`p-2.5 rounded-lg border transition-colors ${
                    isSelected 
                      ? "bg-[#6366f1]/20 border-[#6366f1] text-white" 
                      : "bg-white/5 border-white/5 text-white/50"
                  }`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{item.label}</h4>
                    <p className="text-xs text-white/40 mt-1">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-[rgba(255,255,255,0.07)]">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="rounded-lg text-white/60 hover:bg-white/5 uppercase tracking-wider text-[10px] font-black"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedType}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg uppercase tracking-wider text-[10px] font-black px-5"
          >
            Next
          </Button>
        </div>

      </div>
    </div>
  );
}
