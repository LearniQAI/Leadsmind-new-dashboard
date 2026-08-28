"use client";

import React from "react";
import { PlayCircle, FileText, Download, CheckSquare } from "lucide-react";

// Lesson template picker mini previews (Part 3, Step 2) — real illustrative miniature mockups
// of each template's actual structure, same spirit as CourseThemeMiniPreview.tsx (Phase B):
// a lightweight React mock, not a live Craft.js render, so the picker grid stays fast. Each
// one's shape genuinely matches its template's real node tree (see lessonTemplates.ts) rather
// than being a generic decorative thumbnail.
export function LessonTemplateMiniPreview({ templateId }: { templateId: string }) {
  const Bar = ({ w, h = "h-2", tone = "bg-slate-200" }: { w: string; h?: string; tone?: string }) => (
    <div className={`${w} ${h} ${tone} rounded-full`} />
  );

  switch (templateId) {
    case "video-lesson":
      return (
        <div className="flex flex-col gap-2 p-3">
          <Bar w="w-10" h="h-1.5" tone="bg-sky-400" />
          <Bar w="w-3/4" h="h-2.5" tone="bg-slate-800" />
          <Bar w="w-full" tone="bg-slate-200" />
          <div className="mt-1 aspect-video w-full rounded-md bg-slate-800 flex items-center justify-center">
            <PlayCircle size={18} className="text-white/70" />
          </div>
          <Bar w="w-1/2" h="h-1.5" tone="bg-slate-700" />
          <div className="space-y-1">
            <Bar w="w-full" tone="bg-slate-200" />
            <Bar w="w-4/5" tone="bg-slate-200" />
          </div>
        </div>
      );
    case "reading-lesson":
      return (
        <div className="flex flex-col gap-2 p-3">
          <Bar w="w-10" h="h-1.5" tone="bg-sky-400" />
          <Bar w="w-3/4" h="h-2.5" tone="bg-slate-800" />
          <Bar w="w-full" tone="bg-slate-200" />
          <div className="mt-1 h-16 w-full rounded-md border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center">
            <FileText size={18} className="text-slate-400" />
          </div>
          <div className="space-y-1">
            <Bar w="w-full" tone="bg-slate-200" />
            <Bar w="w-3/5" tone="bg-slate-200" />
          </div>
        </div>
      );
    case "mixed-media-lesson":
      return (
        <div className="flex flex-col gap-2 p-3">
          <Bar w="w-10" h="h-1.5" tone="bg-sky-400" />
          <Bar w="w-3/4" h="h-2.5" tone="bg-slate-800" />
          <Bar w="w-full" tone="bg-slate-200" />
          <div className="mt-1 grid grid-cols-2 gap-2">
            <div className="aspect-square rounded-md bg-slate-800 flex items-center justify-center">
              <PlayCircle size={16} className="text-white/70" />
            </div>
            <div className="aspect-square rounded-md border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center">
              <Download size={16} className="text-slate-400" />
            </div>
          </div>
        </div>
      );
    case "assessment-lesson":
      return (
        <div className="flex flex-col items-center gap-2 p-3">
          <Bar w="w-10" h="h-1.5" tone="bg-amber-400" />
          <Bar w="w-2/3" h="h-2.5" tone="bg-slate-800" />
          <Bar w="w-1/2" tone="bg-slate-200" />
          <div className="mt-1 h-20 w-full rounded-md border border-slate-200 bg-white shadow-sm flex flex-col items-center justify-center gap-1.5">
            <CheckSquare size={18} className="text-orange-500" />
            <Bar w="w-2/3" h="h-1.5" tone="bg-slate-200" />
          </div>
        </div>
      );
    default:
      return <div className="p-3" />;
  }
}
