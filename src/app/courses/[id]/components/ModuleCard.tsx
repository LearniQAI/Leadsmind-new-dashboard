"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
  Eye,
  HelpCircle,
  GripVertical,
  ArrowUp,
  ArrowDown,
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
import { ORANGE_ACTION } from "@/lib/lms/brandOrange";
import { Tooltip, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { DashTooltipContent } from "@/components/dashboard-ui/Tooltip";
import { deriveModuleStatus, statusActionFor, type ModuleStatus } from "@/lib/lms/moduleStatus";

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
      result.push(`<li class="text-[15px] leading-relaxed">${processed.substring(2)}</li>`);
    } else {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      result.push(
        `<p class="text-[15px] text-dash-textMuted leading-relaxed mb-2">${processed}</p>`
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
  /** 1-based position among ALL of this course's modules (not just the filtered/visible
   *  ones) — kept stable under search so a module doesn't get renumbered as filters change. */
  moduleNumber: number;
  /** Module-Level Quiz pass — needed to route to /courses/{courseId}/module-quiz/{module.id},
   *  the module's quiz list (a module can hold several quizzes). */
  courseId: string;
  siblingModules: { id: string; title: string }[];
  onEditModule: (module: any) => void;
  onDeleteModule: (moduleId: string) => void;
  onAddLesson: (moduleId: string) => void;
  onEditLesson: (lesson: any, moduleId: string) => void;
  onDeleteLesson: (lessonId: string) => void;
  onChangeModuleStatus: (moduleId: string, target: ModuleStatus) => void;
  onToggleLessonActive: (lessonId: string, isActive: boolean) => void;
  onDuplicateModule: (moduleId: string) => void;
  onDuplicateLesson: (lessonId: string) => void;
  onMoveLesson: (lessonId: string, targetModuleId: string) => void;
  onViewLesson: (lesson: any) => void;
  onCreateAssignment: (lesson: any) => void;
  /** Curriculum reordering. Disabled while a search or filter narrows the list. */
  reorder?: {
    enabled: boolean;
    isFirst: boolean;
    isLast: boolean;
    isDragOver: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onDragStart: () => void;
    onDragEnter: () => void;
    onDrop: () => void;
    onDragEnd: () => void;
  };
}

export default function ModuleCard({
  module,
  moduleNumber,
  courseId,
  siblingModules,
  onEditModule,
  onDeleteModule,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  onChangeModuleStatus,
  onToggleLessonActive,
  onDuplicateModule,
  onDuplicateLesson,
  onMoveLesson,
  onViewLesson,
  onCreateAssignment,
  reorder,
}: ModuleCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  // Only the handle starts a drag, so text selection and the card's own buttons stay normal.
  const [handleHeld, setHandleHeld] = useState(false);

  const lessonCount = module.lessons?.length || 0;
  const hasLessons = lessonCount > 0;
  const otherModules = siblingModules.filter((m) => m.id !== module.id);

  const lifecycle = deriveModuleStatus(module);
  const statusTone = lifecycle === "PUBLISHED" ? "green" : lifecycle === "INACTIVE" ? "amber" : "slate";
  const lifecycleAction = statusActionFor(lifecycle);

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
      draggable={!!reorder?.enabled && handleHeld}
      onDragStart={(e) => {
        if (reorder?.enabled && handleHeld) {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", module.id);
          reorder.onDragStart();
        }
      }}
      onDragEnter={() => reorder?.enabled && reorder.onDragEnter()}
      onDragOver={(e) => { if (reorder?.enabled) e.preventDefault(); }}
      onDrop={(e) => { if (reorder?.enabled) { e.preventDefault(); reorder.onDrop(); } }}
      onDragEnd={() => { setHandleHeld(false); reorder?.onDragEnd(); }}
      className={cn(
        "overflow-hidden rounded-2xl border border-dash-border bg-white transition-shadow",
        CARD_SHADOW,
        reorder?.isDragOver && "ring-2 ring-sky-400"
      )}
    >
      {/* Module header */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3.5",
          isExpanded && "border-b border-dash-border"
        )}
      >
        {reorder && (
          <div className="flex shrink-0 items-center gap-0.5">
            <span
              role="img"
              aria-label="Drag to reorder"
              title={reorder.enabled ? "Drag to reorder" : "Clear search and filters to reorder"}
              onMouseDown={() => setHandleHeld(true)}
              onMouseUp={() => setHandleHeld(false)}
              className={cn("rounded-md p-0.5 text-dash-textMuted", reorder.enabled ? "cursor-grab hover:bg-dash-surface active:cursor-grabbing" : "cursor-not-allowed opacity-40")}
            >
              <GripVertical size={16} />
            </span>
            <div className="flex flex-col">
              <button
                onClick={reorder.onMoveUp}
                disabled={!reorder.enabled || reorder.isFirst}
                aria-label="Move module up"
                title="Move up"
                className="rounded p-0 text-dash-textMuted hover:bg-dash-surface disabled:opacity-30"
              >
                <ArrowUp size={13} />
              </button>
              <button
                onClick={reorder.onMoveDown}
                disabled={!reorder.enabled || reorder.isLast}
                aria-label="Move module down"
                title="Move down"
                className="rounded p-0 text-dash-textMuted hover:bg-dash-surface disabled:opacity-30"
              >
                <ArrowDown size={13} />
              </button>
            </div>
          </div>
        )}

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
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-sky-600/70">
              Module {moduleNumber}
            </span>
            <h3 className="font-display truncate text-[17px] font-bold tracking-tight text-dash-text">
              {module.title || module.name}
            </h3>
            <StatusPill tone={statusTone as any}>{lifecycle}</StatusPill>
            <StatusPill tone={module.required_for_completion ? "red" : "slate"}>
              {module.required_for_completion ? <><Lock /> Required</> : "Optional"}
            </StatusPill>
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

        {/* Brand orange (same #F7941D / #E07E0C as the Continue Learning CTA). The hint sits on the
            button so the quiz is created last, once the module's lessons exist. */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => router.push(`/courses/${courseId}/module-quiz/${module.id}`)}
                aria-label="Module quizzes"
                className={cn("hidden shrink-0 items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-[11px] font-semibold transition-colors sm:flex", ORANGE_ACTION)}
              >
                <HelpCircle size={13} /> Module Quizzes
              </button>
            </TooltipTrigger>
            <DashTooltipContent className="max-w-[240px]">
              Create the quiz last, after you&apos;ve added all the lessons for this module.
            </DashTooltipContent>
          </Tooltip>
        </TooltipProvider>

        <button
          onClick={() => onAddLesson(module.id)}
          title="Add lesson"
          aria-label="Add lesson"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-dash-textMuted transition-colors hover:bg-dash-surface hover:text-dash-text"
        >
          <Plus size={16} />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-dash-textMuted transition-colors hover:bg-dash-surface hover:text-dash-text">
              <MoreHorizontal size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAddLesson(module.id)}>Add lesson</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onChangeModuleStatus(module.id, lifecycleAction.target)}>
              {lifecycleAction.label}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEditModule(module)}>Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicateModule(module.id)}>Duplicate</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDeleteModule(module.id)}
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
                {module.lessons.map((lesson: any, lessonIdx: number) => {
                  const isLessonActive = lesson.is_active !== false;
                  return (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-dash-surface/60"
                    >
                      <button
                        onClick={() => onEditLesson(lesson, module.id)}
                        className="group flex min-w-0 items-baseline gap-2 text-left"
                      >
                        <span className="shrink-0 text-[10.5px] font-bold uppercase tracking-[0.06em] text-dash-textMuted/70">
                          Lecture {lessonIdx + 1}
                        </span>
                        <span className="font-display min-w-0 truncate text-[15px] font-bold tracking-tight text-dash-text transition-colors motion-reduce:transition-none group-hover:text-sky-600">
                          {lesson.title}
                        </span>
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

                        <button
                          onClick={() => onViewLesson(lesson)}
                          title="Preview lesson"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-dash-textMuted transition-colors hover:bg-white hover:text-sky-600"
                        >
                          <Eye size={14} />
                        </button>

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
