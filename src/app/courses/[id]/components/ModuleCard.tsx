"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PlayCircle,
  Edit,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Lock,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";

function parseMarkdownToHtml(markdown: string): string {
  if (!markdown) return "";

  const lines = markdown.split("\n");
  const result: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      continue;
    }

    // Process formatting on the line
    let processed = trimmed
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-dash-text">$1</strong>');

    // Check for headers
    if (processed.startsWith("### ")) {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      result.push(`<h3 class="text-[10px] font-bold text-dash-textMuted mt-4 mb-1.5 flex items-center gap-1.5">${processed.substring(4)}</h3>`);
    } else if (processed.startsWith("## ")) {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      result.push(`<h2 class="text-xs font-bold text-dash-textMuted mt-5 mb-2 flex items-center gap-1.5">${processed.substring(3)}</h2>`);
    } else if (processed.startsWith("# ")) {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      result.push(`<h1 class="text-sm font-bold text-dash-text mt-6 mb-2.5 flex items-center gap-1.5">${processed.substring(2)}</h1>`);
    } else if (processed.startsWith("- ") || processed.startsWith("* ")) {
      if (!inList) {
        result.push('<ul class="space-y-1.5 my-2 list-disc list-inside text-dash-textMuted">');
        inList = true;
      }
      result.push(`<li class="text-[11px] text-dash-textMuted pl-0.5">${processed.substring(2)}</li>`);
    } else {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      result.push(`<p class="text-[11px] text-dash-textMuted leading-relaxed mb-1.5">${processed}</p>`);
    }
  }

  if (inList) {
    result.push("</ul>");
  }

  return result.join("\n");
}

interface ModuleCardProps {
  module: any;
  onEditModule: (module: any) => void;
  onDeleteModule: (moduleId: string) => void;
  onAddLesson: (moduleId: string) => void;
  onEditLesson: (lesson: any, moduleId: string) => void;
  onDeleteLesson: (lessonId: string) => void;
}

export default function ModuleCard({
  module,
  onEditModule,
  onDeleteModule,
  onAddLesson,
  onEditLesson,
  onDeleteLesson
}: ModuleCardProps) {
  const getPublishStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "published":
        return "bg-green/10 text-green border border-green/20";
      case "coming soon":
      case "coming_soon":
        return "bg-amber-100 text-amber-600 border border-amber-200";
      default:
        return "bg-purple-100 text-purple-600 border border-purple-200";
    }
  };

  const hasLessons = module.lessons && module.lessons.length > 0;

  return (
    <div className="bg-white border border-dash-border rounded-2xl p-6 hover:border-dash-text/10 transition-all motion-reduce:transition-none shadow-sm group">
      {/* Module Title Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-dash-border pb-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-dash-surface rounded-xl flex items-center justify-center text-2xl border border-dash-border group-hover:border-primary/20 transition-all motion-reduce:transition-none shrink-0">
            {module.icon_emoji && module.icon_emoji.startsWith("fa-") ? (
              <i className={`${module.icon_emoji} text-dash-accent text-xl`}></i>
            ) : (
              module.icon_emoji || "📚"
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h3 className="text-lg font-bold !text-dash-text">
                {module.title || module.name}
              </h3>

              <Badge className={`text-[9px] font-bold px-2 py-0.5 rounded-md capitalize ${getPublishStatusBadge(module.publish_status)}`}>
                {module.publish_status || "Draft"}
              </Badge>

              {module.is_required_for_completion && (
                <Badge className="bg-red/10 text-red border border-red/20 text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Lock size={10} /> Required
                </Badge>
              )}

              {module.is_active === false && (
                <Badge className="bg-dash-surface !text-dash-textMuted border border-dash-border text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <EyeOff size={10} /> Inactive
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 text-[11px] !text-dash-textMuted font-mono">
              <span>{module.nqf_level || "No NQF Level"}</span>
              <span>•</span>
              <span>{module.lessons?.length || 0} Lessons</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                ⏱️ Drip:
                <input
                  type="number"
                  min="0"
                  defaultValue={module.drip_days || 0}
                  onBlur={async (e) => {
                    const val = parseInt(e.target.value) || 0;
                    if (val !== module.drip_days) {
                      try {
                        const res = await fetch(`/api/lms/modules?id=${module.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ drip_days: val })
                        });
                        const data = await res.json();
                        if (data.error) toast.error(data.error);
                        else toast.success("Relative drip timeline interval updated.");
                      } catch {
                        toast.error("Failed to sync relative drip interval");
                      }
                    }
                  }}
                  className="w-12 bg-dash-surface border border-dash-border rounded px-1.5 py-0.5 text-center font-mono text-[10px] outline-none focus:border-primary !text-dash-text"
                /> days
              </span>
            </div>
          </div>
        </div>

        {/* Module Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEditModule(module)}
            className="w-8 h-8 rounded-lg bg-dash-surface border border-dash-border flex items-center justify-center !text-dash-textMuted hover:bg-dash-border/60 hover:!text-dash-text transition-all motion-reduce:transition-none active:scale-95 motion-reduce:active:scale-100"
            title="Edit Module Properties"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete module "${module.title || module.name}"?`)) {
                onDeleteModule(module.id);
              }
            }}
            className="w-8 h-8 rounded-lg bg-red/10 border border-red/20 flex items-center justify-center text-red hover:bg-red/20 transition-all motion-reduce:transition-none active:scale-95 motion-reduce:active:scale-100"
            title="Delete Module"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Description */}
      {module.description && (
        <div
          className="mt-4 border-b border-dash-border pb-4 space-y-1.5"
          dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(module.description) }}
        />
      )}

      {/* Curriculum list */}
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold !text-dash-textMuted">
            Lessons & lectures
          </span>
          <button
            onClick={() => onAddLesson(module.id)}
            className="text-[10px] font-bold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors motion-reduce:transition-none"
          >
            <Plus size={12} /> Add Lesson
          </button>
        </div>

        {!hasLessons ? (
          <div className="py-8 bg-dash-surface border border-dashed border-dash-border rounded-xl flex flex-col items-center justify-center text-center">
            <PlayCircle size={24} className="!text-dash-textMuted mb-2" />
            <span className="text-[11px] font-medium !text-dash-textMuted">No lessons created inside this module.</span>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {module.lessons.map((lesson: any, index: number) => (
              <div
                key={lesson.id}
                className="bg-dash-surface border border-dash-border hover:border-dash-text/10 hover:bg-dash-border/30 rounded-xl p-3.5 flex items-center justify-between gap-4 transition-all motion-reduce:transition-none group/item"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-[11px] font-bold border border-primary/20 shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold !text-dash-text block truncate group-hover/item:text-primary transition-colors motion-reduce:transition-none">
                      {lesson.title}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      {lesson.is_free && (
                        <Badge className="bg-green/10 text-green border border-green/20 text-[8px] font-bold px-1.5 py-0.5 rounded">
                          Free Preview
                        </Badge>
                      )}
                      {lesson.video_url && (
                        <span className="text-[9px] font-mono !text-dash-textMuted truncate max-w-[150px]">
                          🎥 {lesson.video_url}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lesson Actions */}
                <div className="flex items-center gap-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity motion-reduce:transition-none">
                  <button
                    onClick={() => onEditLesson(lesson, module.id)}
                    className="w-7 h-7 rounded-lg bg-white flex items-center justify-center !text-dash-textMuted hover:bg-dash-border/60 hover:!text-dash-text transition-colors motion-reduce:transition-none"
                    title="Edit Lesson"
                  >
                    <Edit size={12} />
                  </button>
                  <button
                    onClick={() => onDeleteLesson(lesson.id)}
                    className="w-7 h-7 rounded-lg bg-red/10 flex items-center justify-center text-red hover:bg-red/20 transition-colors motion-reduce:transition-none"
                    title="Delete Lesson"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
