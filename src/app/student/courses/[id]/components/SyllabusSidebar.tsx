import React from 'react';
import { Lock, Play, Download, CheckCircle2, Clock, Gauge, HelpCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { getCourseTheme } from '@/lib/courses/courseThemeTokens';

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
  studentName?: string | null;
}

function initials(name?: string | null): string {
  if (!name) return 'S';
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join('') || 'S'
  );
}

export default function SyllabusSidebar({
  course,
  modules,
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
  lessonsByModule,
  studentName,
}: SyllabusSidebarProps) {
  const tutorName: string | null = course?.landing_page_settings?.instructor?.name?.trim() || null;
  const theme = getCourseTheme(course?.landing_page_settings?.template);
  const accent = theme.primaryHex;

  return (
    <aside className="flex w-[272px] shrink-0 flex-col border-r border-dash-border bg-dash-surface/50">
      {/* Student card */}
      <div className="flex items-center gap-3 border-b border-dash-border px-5 py-4">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
          style={{ background: accent }}
        >
          {initials(studentName)}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold !text-dash-text">
            {studentName || 'Student'}
          </div>
          <div className="text-[11px] !text-dash-textMuted">
            {tutorName ? `Tutor · ${tutorName}` : 'Enrolled student'}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-3 border-b border-dash-border px-5 py-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] !text-dash-textMuted">
            {course.title}
          </div>
          <div className="mt-1 flex items-end justify-between">
            <span className="font-display text-[22px] font-semibold leading-none !text-dash-text">
              {globalProgressPercentage}%
            </span>
            <span className="text-[11px] !text-dash-textMuted">
              {completedLessonsCount} / {totalLessonsCount} lessons
            </span>
          </div>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${globalProgressPercentage}%`, background: accent }}
          />
        </div>

        {globalProgressPercentage === 100 && (
          <button
            onClick={handleDownloadCertificate}
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-[12px] font-semibold text-white shadow-sm transition-transform hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] [&_svg]:size-3.5"
          >
            <Download /> Download certificate
          </button>
        )}
      </div>

      {/* Lesson list */}
      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {modules.map((mod, modIdx) => {
          const moduleLessons = lessonsByModule[mod.id] || [];
          return (
            <div key={mod.id} className="space-y-1">
              <div className="flex items-center justify-between px-2 pb-1">
                <span
                  className="truncate text-[11px] font-semibold uppercase tracking-[0.1em]"
                  style={{ color: accent }}
                >
                  {modIdx + 1}. {mod.title}
                </span>
                {mod.required_for_completion && (
                  <span className="shrink-0 rounded border border-dash-border bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide !text-dash-textMuted">
                    Required
                  </span>
                )}
              </div>

              <div className="space-y-1">
                {moduleLessons.map((les) => {
                  const lockReason = getLessonLockReason(les, mod, modIdx);
                  const isSelected = activeLesson?.id === les.id;
                  const isDone = completedLessonIds.includes(les.id);

                  return (
                    <button
                      key={les.id}
                      onClick={() => {
                        if (!lockReason) setActiveLesson(les);
                      }}
                      disabled={!!lockReason}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                        isSelected
                          ? 'border-transparent'
                          : 'border-transparent hover:bg-white'
                      } ${lockReason ? 'cursor-not-allowed opacity-45' : ''}`}
                      style={
                        isSelected
                          ? { background: `${accent}14`, borderColor: `${accent}55` }
                          : undefined
                      }
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        {lockReason ? (
                          <Lock size={14} className="shrink-0 !text-dash-textMuted" />
                        ) : isDone ? (
                          <CheckCircle2 size={15} className="shrink-0" style={{ color: accent }} />
                        ) : (
                          <Play size={13} className="shrink-0 !text-dash-textMuted" />
                        )}
                        <span
                          className={`truncate text-[13px] ${
                            isSelected ? 'font-semibold !text-dash-text' : '!text-dash-textMuted'
                          }`}
                        >
                          {les.title}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {les.time_estimate_minutes != null && (
                          <span className="flex items-center gap-0.5 text-[10px] !text-dash-textMuted">
                            <Clock size={10} /> {les.time_estimate_minutes}m
                          </span>
                        )}
                        <span className="text-[10px] uppercase !text-dash-textMuted/70">
                          {les.lesson_type}
                        </span>
                      </span>
                    </button>
                  );
                })}
                {moduleLessons.length === 0 && (
                  <span className="block px-3 py-1.5 text-[11px] italic !text-dash-textMuted/60">
                    No lessons in this module
                  </span>
                )}

                {/* Module-level quiz entry point — only for modules that actually have one
                    configured. Locked until every lesson in the module is complete, mirroring
                    getModuleCompletionStatus() (the same all-lessons-complete rule the
                    module-quiz page enforces server-side) and the locked-lesson visual above. */}
                {mod.has_module_quiz && (() => {
                  const allLessonsDone =
                    moduleLessons.length === 0 ||
                    moduleLessons.every((l: any) => completedLessonIds.includes(l.id));
                  const inner = (
                    <>
                      <span className="flex min-w-0 items-center gap-2.5">
                        {allLessonsDone ? (
                          <HelpCircle size={14} className="shrink-0" style={{ color: accent }} />
                        ) : (
                          <Lock size={14} className="shrink-0 !text-dash-textMuted" />
                        )}
                        <span
                          className={`truncate text-[13px] ${
                            allLessonsDone ? 'font-semibold !text-dash-text' : '!text-dash-textMuted'
                          }`}
                        >
                          Module quiz
                        </span>
                      </span>
                      <span className="text-[10px] uppercase !text-dash-textMuted/70">
                        {allLessonsDone ? 'Quiz' : 'Locked'}
                      </span>
                    </>
                  );
                  const base =
                    'mt-1 flex w-full items-center justify-between gap-3 rounded-xl border border-dashed px-3 py-2.5 text-left transition-colors';
                  return allLessonsDone ? (
                    <a
                      href={`/student/courses/${course.id}/module-quiz/${mod.id}`}
                      className={`${base} border-dash-border hover:bg-white`}
                      style={{ borderColor: `${accent}55` }}
                    >
                      {inner}
                    </a>
                  ) : (
                    <div
                      aria-disabled="true"
                      title="Complete every lesson in this module to unlock its quiz"
                      className={`${base} cursor-not-allowed border-dash-border opacity-45`}
                    >
                      {inner}
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer — bandwidth toggle */}
      <div className="flex items-center justify-between border-t border-dash-border px-5 py-3">
        <span className="flex items-center gap-1.5 text-[11px] font-medium !text-dash-textMuted">
          <Gauge size={13} /> Data saver
        </span>
        <Switch
          checked={lowBandwidthMode}
          onCheckedChange={setLowBandwidthMode}
          className="data-[state=checked]:bg-emerald-500"
          title="Low-bandwidth mode — throttles video bitrate"
        />
      </div>
    </aside>
  );
}
