"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Lock, PlayCircle, CheckCircle, 
  Circle, Clock, BookOpen, AlertTriangle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { completeLessonAction } from "@/app/actions/lms";
import SpecializedPlayer from "./components/SpecializedPlayer";

interface CoursePlayerClientProps {
  course: any;
  modules: any[];
  initialProgress: any[];
}

export default function CoursePlayerClient({
  course,
  modules,
  initialProgress
}: CoursePlayerClientProps) {
  const router = useRouter();
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [progress, setProgress] = useState<any[]>(initialProgress);
  const [isPending, startTransition] = useTransition();

  // 1. Calculate locks and completeness mapping
  const completedLessonIds = new Set(progress.map((p) => p.lesson_id));

  // Determine if a module is 100% complete
  const isModuleComplete = (mod: any) => {
    if (!mod.lessons || mod.lessons.length === 0) return true;
    return mod.lessons.every((les: any) => completedLessonIds.has(les.id));
  };

  // Build list of module lock states
  const moduleStatusMap: Record<string, { isLocked: boolean; reason?: "completion" | "coming_soon" }> = {};
  let previousRequiredIncomplete = false;

  const sortedModules = [...modules]
    .filter((mod) => mod.is_active !== false)
    .sort((a, b) => a.order_index - b.order_index);

  sortedModules.forEach((mod) => {
    if (mod.publish_status === "Coming Soon") {
      moduleStatusMap[mod.id] = { isLocked: true, reason: "coming_soon" };
    } else if (previousRequiredIncomplete) {
      moduleStatusMap[mod.id] = { isLocked: true, reason: "completion" };
    } else {
      moduleStatusMap[mod.id] = { isLocked: false };
    }

    // If this module is required but incomplete, lock all subsequent modules
    if (mod.is_required_for_completion && !isModuleComplete(mod) && mod.publish_status !== "Coming Soon") {
      previousRequiredIncomplete = true;
    }
  });

  // Flat lessons list with computed lock status
  const lessonsWithStatus = sortedModules.flatMap((mod) => {
    const modLock = moduleStatusMap[mod.id];
    const lessons = mod.lessons || [];
    return lessons.map((les: any) => ({
      ...les,
      moduleId: mod.id,
      moduleName: mod.name,
      isLocked: modLock.isLocked,
      lockReason: modLock.reason
    }));
  });

  // Select first unlocked lesson as default
  useEffect(() => {
    if (!activeLessonId && lessonsWithStatus.length > 0) {
      const firstAvailable = lessonsWithStatus.find((l) => !l.isLocked);
      if (firstAvailable) {
        setActiveLessonId(firstAvailable.id);
      } else {
        setActiveLessonId(lessonsWithStatus[0].id);
      }
    }
  }, [activeLessonId, lessonsWithStatus]);

  const activeLesson = lessonsWithStatus.find((l) => l.id === activeLessonId);

  const handleComplete = async () => {
    if (!activeLessonId) return;

    startTransition(async () => {
      const res = await completeLessonAction(activeLessonId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Progress persisted!");
        
        // Optimistically update local progress state
        setProgress((prev) => [...prev, { lesson_id: activeLessonId, completed: true }]);

        // Auto advance to next lesson in sequence
        const currentIdx = lessonsWithStatus.findIndex((l) => l.id === activeLessonId);
        if (currentIdx !== -1 && currentIdx < lessonsWithStatus.length - 1) {
          const nextLesson = lessonsWithStatus[currentIdx + 1];
          if (!nextLesson.isLocked) {
            setActiveLessonId(nextLesson.id);
          } else {
            toast.info("Next lesson is currently locked.");
          }
        }
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={() => router.push("/courses")}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white uppercase tracking-wider font-bold bg-white/5 border border-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl transition-all"
        >
          <ArrowLeft size={13} /> Back to Academy
        </button>
      </div>

      {/* Grid Player */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
        {/* Left Navigation Sidebar */}
        <div className="bg-[#080f28] border border-white/5 rounded-2xl p-5 space-y-6">
          <div className="border-b border-white/5 pb-4">
            <span className="text-[9px] font-black text-accent2 uppercase tracking-widest block mb-1">Academy Player</span>
            <h3 className="text-sm font-space-grotesk font-black text-white uppercase tracking-tight truncate">{course.title}</h3>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {sortedModules.map((mod) => {
              const lockInfo = moduleStatusMap[mod.id];
              const modLessons = mod.lessons || [];

              return (
                <div key={mod.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white uppercase tracking-tight flex items-center gap-1.5">
                      <span className="text-xs w-4 h-4 flex items-center justify-center shrink-0">
                        {mod.icon_emoji && mod.icon_emoji.startsWith("fa-") ? (
                          <i className={`${mod.icon_emoji} text-accent2 text-[11px]`}></i>
                        ) : (
                          mod.icon_emoji || "📚"
                        )}
                      </span>
                      {mod.name}
                    </span>
                    {lockInfo.isLocked && (
                      <span className="text-[9px] font-bold text-amber flex items-center gap-0.5">
                        <Lock size={10} /> Lock
                      </span>
                    )}
                  </div>

                  <div className="pl-3 border-l border-white/5 space-y-1.5">
                    {modLessons.length === 0 ? (
                      <span className="text-[9.5px] text-white/20 italic block pl-2">No lessons</span>
                    ) : (
                      modLessons.map((les: any) => {
                        const isCompleted = completedLessonIds.has(les.id);
                        const isSelected = les.id === activeLessonId;
                        const isLocked = lockInfo.isLocked;

                        return (
                          <div
                            key={les.id}
                            onClick={() => {
                              if (isLocked) {
                                toast.error("This module component is locked.");
                                return;
                              }
                              setActiveLessonId(les.id);
                            }}
                            className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs cursor-pointer select-none transition-all ${
                              isSelected 
                                ? "bg-accent/10 border border-accent/20 text-white" 
                                : isLocked 
                                  ? "opacity-40 cursor-not-allowed hover:bg-transparent text-white/40"
                                  : "text-white/60 hover:bg-white/[0.02] hover:text-white"
                            }`}
                          >
                            <span className="truncate pr-1">{les.title}</span>
                            <div className="shrink-0">
                              {isCompleted ? (
                                <CheckCircle size={13} className="text-green shrink-0" />
                              ) : isLocked ? (
                                <Lock size={12} className="text-white/30 shrink-0" />
                              ) : (
                                <Circle size={12} className="text-white/20 shrink-0" />
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Active Player Panel */}
        <div className="min-h-[400px]">
          {!activeLesson ? (
            <div className="bg-[#080f28] border border-white/5 rounded-2xl p-10 text-center flex flex-col items-center justify-center h-full">
              <PlayCircle size={40} className="text-white/20 mb-3 animate-pulse" />
              <h4 className="text-sm font-space-grotesk font-black uppercase text-t2 tracking-widest">Classroom Empty</h4>
              <p className="text-t3 text-[10px] font-bold mt-1 uppercase tracking-wider">Please select a lesson in the curriculum sidebar tree.</p>
            </div>
          ) : activeLesson.isLocked ? (
            activeLesson.lockReason === "coming_soon" ? (
              /* Coming Soon Locked view */
              <div className="bg-[#080f28] border border-white/5 rounded-2xl p-10 text-center flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Clock size={40} className="text-amber animate-pulse" />
                <h4 className="text-lg font-space-grotesk font-black uppercase text-amber tracking-widest">
                  Coming Soon Node
                </h4>
                <p className="text-xs text-white/50 max-w-sm mx-auto leading-relaxed font-body">
                  This curriculum module component is locked because the academy administrators have marked it as **"Coming Soon"**.
                </p>
                <Badge className="bg-amber/10 text-amber border border-amber/20 uppercase tracking-widest text-[9px] px-3 py-1 font-bold">
                  Lock State: Upcoming
                </Badge>
              </div>
            ) : (
              /* Dependency locked view */
              <div className="bg-[#080f28] border border-white/5 rounded-2xl p-10 text-center flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Lock size={40} className="text-red animate-bounce" />
                <h4 className="text-lg font-space-grotesk font-black uppercase text-red tracking-widest">
                  Dependency Locked
                </h4>
                <p className="text-xs text-white/50 max-w-sm mx-auto leading-relaxed font-body">
                  Access blocked. A preceding module has been designated as **"Required for Completion"** and is not finished yet.
                </p>
                <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl text-[10px] font-mono text-red flex items-center gap-1.5 max-w-xs mx-auto">
                  <AlertTriangle size={12} /> Please complete all prior module requirements first
                </div>
              </div>
            )
          ) : (
            /* Unlocked active Player view */
            <SpecializedPlayer 
              lesson={activeLesson} 
              onComplete={handleComplete} 
              isCompleting={isPending} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
