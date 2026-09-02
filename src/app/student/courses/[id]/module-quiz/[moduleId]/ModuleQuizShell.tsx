'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import SyllabusSidebar from '../../components/SyllabusSidebar';
import { getLessonLockReason } from '../../components/lock-utils';
import { getCourseTheme } from '@/lib/courses/courseThemeTokens';

interface Props {
  course: any;
  modules: any[];
  lessons: any[];
  completedLessonIds: string[];
  enrollment: any;
  studentName: string | null;
  activeModuleId: string;
  children: React.ReactNode;
}

/**
 * Part 3 fix: the module-quiz page used to render inside the top-level /student portal
 * layout, so it showed the generic portal nav ("My Dashboard / My Results / …") instead of
 * the in-course sidebar — as if the student had left the course. This wraps the quiz in the
 * SAME full-bleed course chrome the lesson player uses (top bar + the real SyllabusSidebar
 * with profile, course progress and the module/lesson list), reusing SyllabusSidebar
 * directly rather than rebuilding it. Selecting a lesson navigates back into the player.
 */
export default function ModuleQuizShell({
  course,
  modules,
  lessons,
  completedLessonIds,
  enrollment,
  studentName,
  activeModuleId,
  children,
}: Props) {
  const router = useRouter();
  const theme = getCourseTheme(course?.landing_page_settings?.template);

  const lessonsByModule = React.useMemo(() => {
    const map: Record<string, any[]> = {};
    lessons.forEach((l) => {
      (map[l.module_id] ||= []).push(l);
    });
    return map;
  }, [lessons]);

  const totalLessonsCount = lessons.length;
  const completedLessonsCount = lessons.filter((l) => completedLessonIds.includes(l.id)).length;
  const globalProgressPercentage =
    totalLessonsCount > 0 ? Math.round((completedLessonsCount / totalLessonsCount) * 100) : 0;

  const activeModule = modules.find((m: any) => m.id === activeModuleId);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-dash-bg font-body !text-dash-text">
      {/* Top bar — mirrors the lesson player */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-dash-border bg-white px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => router.push(`/student/courses/${course.id}`)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium !text-dash-textMuted transition-colors hover:bg-dash-surface hover:!text-dash-text"
          >
            <ChevronLeft size={15} /> Back to course
          </button>
          <span className="h-4 w-px bg-dash-border" />
          <h1 className="truncate font-display text-[14px] font-semibold tracking-[-0.01em] !text-dash-text">
            {course.title}
          </h1>
          {activeModule?.title && (
            <>
              <span className="hidden h-4 w-px bg-dash-border sm:block" />
              <span className="hidden truncate text-[12px] !text-dash-textMuted sm:block">
                {activeModule.title} · Quiz
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold !text-dash-text">{globalProgressPercentage}%</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <SyllabusSidebar
          course={course}
          modules={modules}
          lessons={lessons}
          completedLessonIds={completedLessonIds}
          activeLesson={null}
          setActiveLesson={(l: any) =>
            router.push(`/student/courses/${course.id}?lessonId=${l.id}`)
          }
          lowBandwidthMode={false}
          setLowBandwidthMode={() => {}}
          getLessonLockReason={(les, mod, idx) =>
            getLessonLockReason({
              lesson: les,
              module: mod,
              moduleIndex: idx,
              course,
              enrollment,
              modules,
              lessonsByModule,
              completedLessonIds,
            })
          }
          globalProgressPercentage={globalProgressPercentage}
          completedLessonsCount={completedLessonsCount}
          totalLessonsCount={totalLessonsCount}
          handleDownloadCertificate={() =>
            window.open(`/api/student/courses/${course.id}/certificate`, '_blank')
          }
          lessonsByModule={lessonsByModule}
          studentName={studentName}
        />

        <main className="flex flex-1 flex-col overflow-y-auto bg-dash-bg p-6 md:p-10">
          <div className="mx-auto w-full max-w-2xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
