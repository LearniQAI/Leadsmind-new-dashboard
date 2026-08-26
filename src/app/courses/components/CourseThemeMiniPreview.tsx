"use client";

import React from "react";
import { Play, Check, BookOpen } from "lucide-react";
import { CourseThemeTokens } from "@/lib/courses/courseThemeTokens";

interface CourseThemeMiniPreviewProps {
  theme: CourseThemeTokens;
  selected: boolean;
}

// Phase F, Section B: a real miniature rendering of the actual student course player using
// this theme's real tokens — not a static mockup image. Mirrors the real layout structure
// (SyllabusSidebar + StudentPlayerClient): a student-name/progress-bar sidebar strip, a
// lecture title, a video placeholder, and a "Mark as complete" button — all colored from the
// same theme.solidBgClass/gradientClass/textAccentClass used on the real pages, so selecting
// a theme here genuinely previews what the student will see, not a decorative guess.
export default function CourseThemeMiniPreview({ theme, selected }: CourseThemeMiniPreviewProps) {
  return (
    <div className="relative bg-[#0a0f28] rounded-lg overflow-hidden aspect-[4/3] flex text-[6px] leading-none">
      {/* Mini sidebar */}
      <div className="w-[38%] bg-white/[0.03] border-r border-white/5 p-1.5 flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-white/10 shrink-0" />
          <span className="text-white/70 font-bold truncate">Jenima Marayag</span>
        </div>
        <div className="flex items-center gap-0.5">
          <span className="bg-white/10 text-white/60 rounded px-1 py-0.5">Prev</span>
          <span className={`${theme.solidBgClass} text-white rounded px-1 py-0.5`}>Next</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-0.5 overflow-hidden">
          <div className={`h-full bg-gradient-to-r ${theme.gradientClass}`} style={{ width: "30%" }} />
        </div>
        <div className="space-y-1 mt-0.5">
          <div className="text-white/40 font-bold uppercase">Module 1</div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-1">
              <BookOpen size={5} className="text-white/30 shrink-0" />
              <span className="text-white/40 truncate">Lecture {i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main lecture area */}
      <div className="flex-1 p-1.5 flex flex-col gap-1.5 min-w-0">
        <span className="text-white/80 font-bold truncate">Lecture 3</span>
        <div className="flex-1 bg-black/60 rounded flex items-center justify-center relative">
          <span className={`h-4 w-4 rounded-full ${theme.solidBgClass}/90 flex items-center justify-center`}>
            <Play size={6} className="text-white" />
          </span>
        </div>
        <span className={`${theme.solidBgClass} text-white text-center rounded py-0.5 font-bold`}>
          Mark as complete
        </span>
      </div>

      {selected && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="flex items-center gap-1 bg-white rounded-full px-2 py-1">
            <Check size={9} className="text-green" />
            <span className="text-[7px] font-bold text-green">Theme selected</span>
          </div>
        </div>
      )}
    </div>
  );
}
