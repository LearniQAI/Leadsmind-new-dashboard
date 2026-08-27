"use client";

import React, { useState } from "react";
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
import { StatusPill, CARD_SHADOW } from "./settings/primitives";
import { cn } from "@/lib/utils";

function parseMarkdownToHtml(markdown: string): string {
  if (!markdown) return "";
  const lines = markdown.split("\n");
  const result: string[] = [];
  let inList = false;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      continue;
    }
    let processed = trimmed
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-dash-text">$1</strong>');
    if (processed.startsWith("### ")) {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      result.push(
        `<h3 class="text-[11px] font-semibold uppercase tracking-[0.08em] text-dash-textMuted mt-5 mb-2">${processed.substring(
          4
        )}</h3>`
      );
    } else if (processed.startsWith("- ") || processed.startsWith("* ")) {
      if (!inList) {
        result.push('<ul class="space-y-1.5 my-2.5 list-disc pl-4 text-dash-textMuted">');
        inList = true;
      }
      result.push(`<li class="text-[13px] leading-relaxed">${processed.substring(2)}</li>`);
    } else {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      result.push(
        `<p class="text-[13px] text-dash-textMuted leading-relaxed mb-2">${processed}</p>`
      );
    }
  }
  if (inList) result.push("</ul>");
  return result.join("\n");
}

function unlockLabel(lesson: any): string {
  if (lesson.unlock_type === "drip") {
    const d = lesson.drip_value ?? 0;
    return `Day ${d}`;
  }
  return "Immediate";
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

  const lessonCount = module.lessons?.length || 0;
  const hasLessons = lessonCount > 0;
  const otherModules = siblingModules.filter((m) => m.id !== module.id);

  const status = (module.publish_status || "").toLowerCase();
  const statusTone =
    status === "published" ? "green" : status === "coming_soon" ? "amber" : "slate";

  const addLectureBtn = (
    <button
      onClick={() => onAddLesson(module.id)}
      className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-sky-600 [&_svg]:size-3.5"
    >
      <Plus /> Add lecture
    </button>
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-dash-border bg-white transition-shadow",
        CARD_SHADOW
      )}
    >
      {/* Module header */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3.5",
          isExpanded && "border-b border-dash-border"
        )}
      >
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="shrink-0 rounded-md p-0.5 text-dash-textMuted transition-colors hover:bg-dash-surface hover:text-dash-text"
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-500/15">
          <Layers size={16} />
        </span>

        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate text-[14px] font-semibold text-dash-text">
              {module.title || module.name}
            </h3>
            {module.publish_status && module.publish_status !== "draft" && (
              <StatusPill tone={statusTone as any}>
                {module.publish_status.replace("_", " ")}
              </StatusPill>
            )}
            {module.required_for_completion && (
              <StatusPill tone="red">
                <Lock /> Required
              </StatusPill>
            )}
            {module.is_active === false && (
              <StatusPill tone="slate">
                <EyeOff /> Inactive
              </StatusPill>
            )}
          </div>
          <span className="mt-1 block text-[12px] text-dash-textMuted">
            {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}
          </span>
        </button>

        {module.required_for_completion && (
          <span
            title="Counts toward course completion"
            className="hidden shrink-0 text-sky-500 sm:inline-flex"
          >
            <GraduationCap size={18} />
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-dash-textMuted transition-colors hover:bg-dash-surface hover:text-dash-text">
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
                if (
                  window.confirm(
                    `Delete module "${module.title || module.name}"? This cannot be undone.`
                  )
                ) {
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

      {/* Expanded body */}
      {isExpanded && (
        <div>
          {module.description && (
            <div
              className="px-5 pt-4"
              dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(module.description) }}
            />
          )}

          {!hasLessons ? (
            <div className="p-5">
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-dash-border bg-dash-surface/40 px-6 py-10 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-dash-border bg-white text-dash-textMuted">
                  <PlayCircle size={20} />
                </span>
                <h4 className="mt-3 text-[13px] font-semibold text-dash-text">No lessons yet</h4>
                <p className="mt-1 text-[12px] text-dash-textMuted">
                  Add the first lecture to this module.
                </p>
                <div className="mt-4">{addLectureBtn}</div>
              </div>
            </div>
          ) : (
            <>
              <div className="divide-y divide-dash-border">
                {module.lessons.map((lesson: any) => {
                  const isLessonActive = lesson.is_active !== false;
                  return (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-dash-surface/60"
                    >
                      <button
                        onClick={() => onEditLesson(lesson, module.id)}
                        className="min-w-0 truncate text-left text-[13px] font-medium text-dash-text transition-colors hover:text-sky-600"
                      >
                        {lesson.title}
                      </button>

                      <div className="flex shrink-0 items-center gap-2">
                        {lesson.is_free && (
                          <StatusPill tone="green">Free</StatusPill>
                        )}

                        <span className="hidden items-center gap-1 rounded-full border border-dash-border bg-white px-2 py-0.5 text-[11px] font-medium text-dash-textMuted sm:inline-flex [&_svg]:size-3">
                          <Droplet /> {unlockLabel(lesson)}
                        </span>

                        <span title={isLessonActive ? "Active" : "Deactivated"}>
                          <CheckCircle2
                            size={17}
                            className={
                              isLessonActive
                                ? "text-emerald-500 fill-emerald-500/15"
                                : "text-dash-textMuted"
                            }
                          />
                        </span>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="flex h-7 w-7 items-center justify-center rounded-lg text-dash-textMuted transition-colors hover:bg-white hover:text-dash-text">
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

              <div className="flex justify-center border-t border-dash-border p-4">
                {addLectureBtn}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
