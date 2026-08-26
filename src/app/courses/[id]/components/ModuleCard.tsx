"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  PlayCircle,
  Plus,
  Lock,
  EyeOff,
  MoreHorizontal,
  Layers,
  Video,
  Headphones,
  FileText,
  Type,
  CheckSquare,
  FileEdit,
  Download,
  Presentation,
  Code2,
  Radio,
  Clock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

function parseMarkdownToHtml(markdown: string): string {
  if (!markdown) return "";
  const lines = markdown.split("\n");
  const result: string[] = [];
  let inList = false;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      if (inList) { result.push("</ul>"); inList = false; }
      continue;
    }
    let processed = trimmed
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-dash-text">$1</strong>');
    if (processed.startsWith("### ")) {
      if (inList) { result.push("</ul>"); inList = false; }
      result.push(`<h3 class="text-[10px] font-bold text-dash-textMuted mt-4 mb-1.5">${processed.substring(4)}</h3>`);
    } else if (processed.startsWith("- ") || processed.startsWith("* ")) {
      if (!inList) { result.push('<ul class="space-y-1.5 my-2 list-disc list-inside text-dash-textMuted">'); inList = true; }
      result.push(`<li class="text-[11px] text-dash-textMuted pl-0.5">${processed.substring(2)}</li>`);
    } else {
      if (inList) { result.push("</ul>"); inList = false; }
      result.push(`<p class="text-[11px] text-dash-textMuted leading-relaxed mb-1.5">${processed}</p>`);
    }
  }
  if (inList) result.push("</ul>");
  return result.join("\n");
}

const LESSON_TYPE_ICON: Record<string, any> = {
  video: Video, audio: Headphones, pdf: FileText, text: Type,
  quiz: CheckSquare, assignment: FileEdit, flashcards: Layers,
  download: Download, slides: Presentation, embed: Code2, live_session: Radio,
};

function unlockBadge(lesson: any): string {
  if (lesson.unlock_type === "drip") {
    return `Drip: ${lesson.drip_value ?? 0} day${(lesson.drip_value ?? 0) === 1 ? "" : "s"}`;
  }
  return "Drip: immediately";
}

interface ModuleCardProps {
  module: any;
  siblingModules: { id: string; title: string }[];
  onEditModule: (module: any) => void;
  onDeleteModule: (moduleId: string) => void;
  onAddLesson: (moduleId: string) => void;
  onEditLesson: (lesson: any, moduleId: string) => void;
  onDeleteLesson: (lessonId: string) => void;
  onToggleModuleActive: (moduleId: string, isActive: boolean) => void;
  onToggleLessonActive: (lessonId: string, isActive: boolean) => void;
  onDuplicateModule: (moduleId: string) => void;
  onDuplicateLesson: (lessonId: string) => void;
  onMoveLesson: (lessonId: string, targetModuleId: string) => void;
  onViewLesson: (lesson: any) => void;
  onCreateAssignment: (lesson: any) => void;
}

export default function ModuleCard({
  module,
  siblingModules,
  onEditModule,
  onDeleteModule,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  onToggleModuleActive,
  onToggleLessonActive,
  onDuplicateModule,
  onDuplicateLesson,
  onMoveLesson,
  onViewLesson,
  onCreateAssignment,
}: ModuleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPublishStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "published": return "bg-green/10 text-green border border-green/20";
      case "coming soon":
      case "coming_soon": return "bg-amber-100 text-amber-600 border border-amber-200";
      default: return "bg-purple-100 text-purple-600 border border-purple-200";
    }
  };

  const hasLessons = module.lessons && module.lessons.length > 0;
  const otherModules = siblingModules.filter((m) => m.id !== module.id);

  return (
    <div className="bg-white border border-dash-border rounded-2xl shadow-sm overflow-hidden">
      {/* Module header — always visible, click to expand/collapse */}
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="text-dash-textMuted hover:text-dash-text transition-colors shrink-0"
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className="w-9 h-9 rounded-lg bg-dash-accent/10 border border-dash-accent/20 flex items-center justify-center text-dash-accent shrink-0">
          <Layers size={16} />
        </div>

        <button onClick={() => setIsExpanded((v) => !v)} className="flex-1 min-w-0 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold !text-dash-text truncate">{module.title || module.name}</h3>
            <Badge className={`text-[9px] font-bold px-2 py-0.5 rounded-md capitalize ${getPublishStatusBadge(module.publish_status)}`}>
              {module.publish_status || "Draft"}
            </Badge>
            {module.required_for_completion && (
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
          <span className="text-[10px] !text-dash-textMuted font-mono mt-0.5 block">
            {module.lessons?.length || 0} lessons · Drip: {module.drip_days || 0} days
          </span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 rounded-lg hover:bg-dash-surface flex items-center justify-center !text-dash-textMuted transition-colors shrink-0">
              <MoreHorizontal size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onToggleModuleActive(module.id, module.is_active === false)}>
              {module.is_active === false ? "Activate" : "Deactivate"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEditModule(module)}>Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicateModule(module.id)}>Duplicate</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                if (window.confirm(`Delete module "${module.title || module.name}"? This cannot be undone.`)) {
                  onDeleteModule(module.id);
                }
              }}
              className="text-red focus:text-red"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Description + lessons — only rendered when expanded */}
      {isExpanded && (
        <div className="border-t border-dash-border p-4 space-y-4">
          {module.description && (
            <div dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(module.description) }} />
          )}

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold !text-dash-textMuted">Lessons & lectures</span>
            <button
              onClick={() => onAddLesson(module.id)}
              className="text-[10px] font-bold text-primary hover:opacity-80 flex items-center gap-1"
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
            <div className="space-y-2">
              {module.lessons.map((lesson: any, index: number) => {
                const LessonIcon = LESSON_TYPE_ICON[lesson.lesson_type] || Type;
                return (
                  <div
                    key={lesson.id}
                    className="bg-dash-surface border border-dash-border rounded-xl p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-dash-accent/10 flex items-center justify-center text-dash-accent shrink-0">
                        <LessonIcon size={13} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold !text-dash-text block truncate">
                          {index + 1}. {lesson.title}
                        </span>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {lesson.is_free && (
                            <Badge className="bg-green/10 text-green border border-green/20 text-[8px] font-bold px-1.5 py-0.5 rounded">
                              Free Preview
                            </Badge>
                          )}
                          {lesson.is_active === false && (
                            <Badge className="bg-dash-surface !text-dash-textMuted border border-dash-border text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <EyeOff size={8} /> Inactive
                            </Badge>
                          )}
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-mono !text-dash-textMuted bg-white border border-dash-border rounded px-1.5 py-0.5">
                            <Clock size={9} /> {unlockBadge(lesson)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-7 w-7 rounded-lg hover:bg-white flex items-center justify-center !text-dash-textMuted transition-colors shrink-0">
                          <MoreHorizontal size={14} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onToggleLessonActive(lesson.id, lesson.is_active === false)}>
                          {lesson.is_active === false ? "Activate" : "Deactivate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditLesson(lesson, module.id)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onViewLesson(lesson)}>View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditLesson(lesson, module.id)}>Settings</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onCreateAssignment(lesson)}>
                          Create an assignment for this lecture
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.info("Drip access email automation is planned but not built yet — see report.")}>
                          Create a drip access email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onDuplicateLesson(lesson.id)}>Duplicate</DropdownMenuItem>
                        {otherModules.length > 0 && (
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Move to module</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {otherModules.map((m) => (
                                <DropdownMenuItem key={m.id} onClick={() => onMoveLesson(lesson.id, m.id)}>
                                  {m.title}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDeleteLesson(lesson.id)}
                          className="text-red focus:text-red"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
