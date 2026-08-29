"use client";

import React from "react";
import { PlayCircle, CheckSquare } from "lucide-react";

// Lesson template picker mini previews (Part 3 v2) — real illustrative miniature mockups
// matching each template's actual real structure (see lessonTemplates.ts), same spirit as
// CourseThemeMiniPreview.tsx: a lightweight React mock, not a live Craft.js render, so the
// picker grid stays fast.
export function LessonTemplateMiniPreview({ templateId }: { templateId: string }) {
  const Bar = ({ w, h = "h-1.5", tone = "bg-slate-200" }: { w: string; h?: string; tone?: string }) => (
    <div className={`${w} ${h} ${tone} rounded-full`} />
  );
  const Check = () => <div className="h-1.5 w-1.5 rounded-full bg-sky-400 shrink-0" />;

  switch (templateId) {
    case "standard-lesson":
      return (
        <div className="flex flex-col gap-1.5 p-3">
          <Bar w="w-8" h="h-1" tone="bg-sky-400" />
          <Bar w="w-4/5" h="h-2" tone="bg-slate-800" />
          <div className="space-y-1 mt-0.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Check />
                <Bar w={i === 1 ? "w-3/5" : "w-4/5"} />
              </div>
            ))}
          </div>
          <div className="mt-1 aspect-video w-full rounded-md border-2 border-white shadow-md bg-slate-800 flex items-center justify-center">
            <PlayCircle size={16} className="text-white/70" />
          </div>
          <div className="mt-1 rounded-md overflow-hidden border border-slate-200">
            <div className="h-2 bg-sky-500" />
            <div className="p-1.5 space-y-1">
              <Bar w="w-3/5" h="h-1" />
              <Bar w="w-1/3" h="h-1.5" tone="bg-sky-500" />
            </div>
          </div>
        </div>
      );
    case "deep-dive-lesson":
      return (
        <div className="flex flex-col gap-1.5 p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Bar w="w-8" h="h-1" tone="bg-sky-400" />
              <Bar w="w-full" h="h-2" tone="bg-slate-800" />
              <Bar w="w-4/5" />
            </div>
            <div className="aspect-video rounded-md border-2 border-white shadow-md bg-slate-800 flex items-center justify-center">
              <PlayCircle size={14} className="text-white/70" />
            </div>
          </div>
          <div className="mt-1 rounded-md overflow-hidden border border-slate-200">
            <div className="h-2 bg-orange-500" />
            <div className="p-1.5 flex items-center gap-1.5">
              <CheckSquare size={12} className="text-orange-500" />
              <Bar w="w-2/5" h="h-1.5" tone="bg-orange-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="aspect-square rounded-md bg-slate-100" />
            <div className="space-y-1">
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Check />
                  <Bar w="w-4/5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    default:
      return <div className="p-3" />;
  }
}
