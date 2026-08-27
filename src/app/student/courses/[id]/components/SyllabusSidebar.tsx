import React from 'react';
import { Lock, Play, Download, UserRound, Clock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { getCourseTheme } from '@/lib/courses/courseThemeTokens';
import { ThemeCompletionIcon, ThemeGlowWrap, ThemeProgressIndicator } from '@/components/courses/theme/ThemeSignature';

interface SyllabusSidebarProps {
  course: any;
  modules: any[];
  lessons: any[];
  completedLessonIds: string[];
  activeLesson: any;
  setActiveLesson: (lesson: any) => void;
  lowBandwidthMode: boolean;
  setLowBandwidthMode: (val: boolean) => void;
  getLessonLockReason: (lesson: any, module: any, moduleIndex: number) => any;
  globalProgressPercentage: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
  handleDownloadCertificate: () => void;
  lessonsByModule: Record<string, any[]>;
}

export default function SyllabusSidebar({
  course,
  modules,
  lessons,
  completedLessonIds,
  activeLesson,
  setActiveLesson,
  lowBandwidthMode,
  setLowBandwidthMode,
  getLessonLockReason,
  globalProgressPercentage,
  completedLessonsCount,
  totalLessonsCount,
  handleDownloadCertificate,
  lessonsByModule
}: SyllabusSidebarProps) {
  // Real, data-backed tutor name — the same instructor record already used on the course's
  // landing page (course.landing_page_settings.instructor), not a hardcoded placeholder.
  // Shown only when an admin has actually set one.
  const tutorName: string | null = course?.landing_page_settings?.instructor?.name?.trim() || null;

  // Phase F: scoped per-course (not per-workspace) — reads this specific course's own
  // template, so two courses in the same workspace with different themes render differently.
  const theme = getCourseTheme(course?.landing_page_settings?.template);

  return (
    <div className="w-[360px] border-r border-white/5 bg-[#04091a]/40 flex flex-col shrink-0">
      {/* Sidebar Header */}
      <div className="p-5 border-b border-white/5 shrink-0 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-mono">Syllabus Explorer</span>
          <span className="text-base font-bold text-white tracking-tight truncate max-w-[200px] mt-0.5">
            {course.title}
          </span>
          {tutorName && (
            <span className="flex items-center gap-1 text-[10px] text-white/40 mt-1">
              <UserRound size={11} className="shrink-0" /> {tutorName}
            </span>
          )}
        </div>
        <Switch
          checked={lowBandwidthMode}
          onCheckedChange={setLowBandwidthMode}
          className="data-[state=checked]:bg-emerald-500"
          title="South African Low-Bandwidth Mode (Throttles bitrates)"
        />
      </div>

      {/* Progress Bar Header */}
      <div className="p-5 border-b border-white/5 bg-white/[0.02] backdrop-blur-md space-y-2.5 shrink-0">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-white/50 uppercase tracking-widest font-mono">Course Completion</span>
          <span className={`font-black ${theme.textAccentClass} font-mono`}>{globalProgressPercentage}%</span>
        </div>
        <ThemeProgressIndicator theme={theme} percent={globalProgressPercentage} moduleCount={modules.length} />
        <div className="text-[9px] text-white/30 uppercase font-bold tracking-wider flex justify-between">
          <span>{completedLessonsCount} Completed</span>
          <span>{totalLessonsCount} Lessons</span>
        </div>

        {globalProgressPercentage === 100 && (
          <Button
            onClick={handleDownloadCertificate}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-10 px-4 mt-2.5 flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
          >
            <Download size={14} />
            Download Certificate 🎓
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {modules.map((mod, modIdx) => {
          const moduleLessons = lessonsByModule[mod.id] || [];

          return (
            <div key={mod.id} className="space-y-1.5">
              {/* Module title/header */}
              <div className="flex items-center justify-between px-2 py-1">
                <span className={`text-xs font-black uppercase ${theme.textAccentClass} tracking-widest truncate max-w-[240px]`}>
                  {modIdx + 1}. {mod.title}
                </span>
                {mod.required_for_completion && (
                  <span className="text-[8px] font-bold text-white/30 uppercase tracking-wider bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/5 shrink-0">
                    Required
                  </span>
                )}
              </div>

              {/* Module lessons list */}
              <div className="space-y-1">
                {moduleLessons.map((les) => {
                  const lockReason = getLessonLockReason(les, mod, modIdx);
                  const isSelected = activeLesson?.id === les.id;
                  const isDone = completedLessonIds.includes(les.id);

                  return (
                    <ThemeGlowWrap key={les.id} theme={theme} active={isSelected}>
                      <div
                        onClick={() => {
                          if (!lockReason) {
                            setActiveLesson(les);
                          }
                        }}
                        className={`p-3.5 ${theme.radiusClass} text-sm flex items-center justify-between gap-3 select-none cursor-pointer transition-all border ${
                          isSelected
                            ? `${theme.solidBgClass}/10 ${theme.borderAccentClass} text-white font-bold`
                            : "bg-white/[0.01] border-transparent text-white/60 hover:bg-white/[0.03] hover:text-white"
                        } ${lockReason ? "opacity-40 cursor-not-allowed" : ""}`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {lockReason ? (
                            <Lock size={14} className="text-white/40 shrink-0" />
                          ) : isDone ? (
                            <ThemeCompletionIcon theme={theme} size={15} />
                          ) : (
                            <Play size={13} className="text-white/40 shrink-0" />
                          )}
                          <span className="truncate pr-1">{les.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {les.time_estimate_minutes != null && (
                            <span className="flex items-center gap-0.5 text-[9px] font-mono text-white/30">
                              <Clock size={10} /> {les.time_estimate_minutes}m
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-white/30 uppercase">
                            {les.lesson_type}
                          </span>
                        </div>
                      </div>
                    </ThemeGlowWrap>
                  );
                })}
                {moduleLessons.length === 0 && (
                  <span className="text-[10px] italic text-white/20 pl-3 block py-1.5">
                    No lectures in module
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
