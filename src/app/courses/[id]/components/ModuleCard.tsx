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
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
      
    // Check for headers
    if (processed.startsWith("### ")) {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      result.push(`<h3 class="text-[10px] font-black text-white/60 uppercase tracking-widest mt-4 mb-1.5 flex items-center gap-1.5">${processed.substring(4)}</h3>`);
    } else if (processed.startsWith("## ")) {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      result.push(`<h2 class="text-xs font-black text-white/70 uppercase tracking-widest mt-5 mb-2 flex items-center gap-1.5">${processed.substring(3)}</h2>`);
    } else if (processed.startsWith("# ")) {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      result.push(`<h1 class="text-sm font-black text-white/80 uppercase tracking-widest mt-6 mb-2.5 flex items-center gap-1.5">${processed.substring(2)}</h1>`);
    } else if (processed.startsWith("- ") || processed.startsWith("* ")) {
      if (!inList) {
        result.push('<ul class="space-y-1.5 my-2 list-disc list-inside text-white/40">');
        inList = true;
      }
      result.push(`<li class="text-[11px] text-white/40 pl-0.5">${processed.substring(2)}</li>`);
    } else {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      result.push(`<p class="text-[11px] text-white/50 leading-relaxed mb-1.5">${processed}</p>`);
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
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "coming soon":
      case "coming_soon":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      default:
        return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
    }
  };

  const hasLessons = module.lessons && module.lessons.length > 0;

  return (
    <div className="bg-[#0c1535] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all shadow-xl group">
      {/* Module Title Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-white/5 pb-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-[#111d47] rounded-xl flex items-center justify-center text-2xl border border-white/5 group-hover:border-primary/20 transition-all shrink-0">
            {module.icon_emoji && module.icon_emoji.startsWith("fa-") ? (
              <i className={`${module.icon_emoji} text-accent2 text-xl`}></i>
            ) : (
              module.icon_emoji || "📚"
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h3 className="text-lg font-space-grotesk font-black text-white uppercase tracking-tight">
                {module.title || module.name}
              </h3>
              
              <Badge className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${getPublishStatusBadge(module.publish_status)}`}>
                {module.publish_status || "Draft"}
              </Badge>

              {module.is_required_for_completion && (
                <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Lock size={10} /> Required
                </Badge>
              )}

              {module.is_active === false && (
                <Badge className="bg-white/10 text-white/50 border border-white/20 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1">
                  <EyeOff size={10} /> Inactive
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 text-[11px] text-white/40 font-mono">
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
                  className="w-12 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-center font-mono text-[10px] outline-none focus:border-primary text-white"
                /> days
              </span>
            </div>
          </div>
        </div>

        {/* Module Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEditModule(module)}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all active:scale-95"
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
            className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all active:scale-95"
            title="Delete Module"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Description */}
      {module.description && (
        <div 
          className="mt-4 border-b border-white/5 pb-4 space-y-1.5 font-body"
          dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(module.description) }}
        />
      )}

      {/* Curriculum list */}
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
            Lessons & lectures
          </span>
          <button
            onClick={() => onAddLesson(module.id)}
            className="text-[10px] font-black uppercase text-primary hover:text-primary-light flex items-center gap-1 transition-colors"
          >
            <Plus size={12} /> Add Lesson
          </button>
        </div>

        {!hasLessons ? (
          <div className="py-8 bg-white/[0.02] border border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center text-center">
            <PlayCircle size={24} className="text-white/20 mb-2" />
            <span className="text-[11px] font-medium text-white/30">No lessons created inside this module.</span>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {module.lessons.map((lesson: any, index: number) => (
              <div
                key={lesson.id}
                className="bg-[#111d47]/40 border border-white/5 hover:border-white/10 hover:bg-[#111d47]/60 rounded-xl p-3.5 flex items-center justify-between gap-4 transition-all group/item"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-[11px] font-bold border border-primary/20 shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate group-hover/item:text-primary transition-colors">
                      {lesson.title}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      {lesson.is_free && (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded">
                          Free Preview
                        </Badge>
                      )}
                      {lesson.video_url && (
                        <span className="text-[9px] font-mono text-white/30 truncate max-w-[150px]">
                          🎥 {lesson.video_url}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lesson Actions */}
                <div className="flex items-center gap-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEditLesson(lesson, module.id)}
                    className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                    title="Edit Lesson"
                  >
                    <Edit size={12} />
                  </button>
                  <button
                    onClick={() => onDeleteLesson(lesson.id)}
                    className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors"
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
