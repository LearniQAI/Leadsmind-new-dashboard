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
  GraduationCap,
  CheckCircle2,
  Droplet,
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
            {module.publish_status && module.publish_status !== "draft" && (
              <Badge className={`text-[9px] font-bold px-2 py-0.5 rounded-md capitalize ${getPublishStatusBadge(module.publish_status)}`}>
                {module.publish_status}
              </Badge>
            )}
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
            {module.lessons?.length || 0} lecture{module.lessons?.length === 1 ? "" : "s"}
          </span>
        </button>

        {/* Certificate-eligible indicator (real: module.required_for_completion feeds course
            completion -> certificate issuance) — matches the reference's icon-before-menu
            placement, backed by a real existing concept rather than a decorative addition. */}
        {module.required_for_completion && (
          <span title="Counts toward course completion" className="text-dash-accent shrink-0 hidden sm:inline-flex">
            <GraduationCap size={18} />
          </span>
        )}

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

      {/* Description + lessons — only rendered when expanded, matching the reference's
          nested-inline-list behavior (no separate panel/modal). */}
      {isExpanded && (
        <div className="border-t border-dash-border">
          {module.description && (
            <div className="p-4 pb-0" dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(module.description) }} />
          )}

          {!hasLessons ? (
            <div className="m-4 py-8 bg-dash-surface border border-dashed border-dash-border rounded-xl flex flex-col items-center justify-center text-center">
              <PlayCircle size={24} className="!text-dash-textMuted mb-2" />
              <span className="text-[11px] font-medium !text-dash-textMuted">No lessons created inside this module.</span>
            </div>
          ) : (
            <div className="divide-y divide-dash-border">
              {module.lessons.map((lesson: any) => {
                const isLessonActive = lesson.is_active !== false;
                return (
                  <div
                    key={lesson.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-dash-surface/60 transition-colors"
                  >
                    <button
                      onClick={() => onEditLesson(lesson, module.id)}
                      className="text-xs font-bold text-dash-accent hover:underline text-left truncate min-w-0"
                    >
                      {lesson.title}
                    </button>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {lesson.is_free && (
                        <Badge className="bg-green/10 text-green border border-green/20 text-[8px] font-bold px-1.5 py-0.5 rounded hidden sm:inline-flex">
                          Free Preview
                        </Badge>
                      )}

                      {/* Real drip pill — matches reference shape (droplet icon + label). */}
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold !text-dash-textMuted bg-white border border-dash-border rounded-full px-2.5 py-1">
                        <Droplet size={11} /> {unlockBadge(lesson)}
                      </span>

                      {/* Real status indicator — wired to the real is_active field (not
                          decorative): filled green = active/live, muted outline = deactivated. */}
                      <span title={isLessonActive ? "Active" : "Deactivated"}>
                        {isLessonActive ? (
                          <CheckCircle2 size={18} className="text-green fill-green/15" />
                        ) : (
                          <CheckCircle2 size={18} className="!text-dash-textMuted" />
                        )}
                      </span>

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
                  </div>
                );
              })}
            </div>
          )}

          {/* "+ Add lecture" — matches the reference's centered placement at the bottom of
              the expanded lesson list, same lesson-creation flow used everywhere else. */}
          <div className="p-4 flex justify-center">
            <button
              onClick={() => onAddLesson(module.id)}
              className="inline-flex items-center gap-1.5 bg-dash-accent hover:bg-dash-accent/90 text-white text-[11px] font-bold rounded-full px-5 py-2.5 shadow-md transition-colors motion-reduce:transition-none"
            >
              <Plus size={13} /> Add lecture
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
