import Link from 'next/link';
import { ChevronRight, BookOpen } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentProfile, getCurrentWorkspaceId } from '@/lib/auth';

type EnrollmentRow = {
  course_id: string;
  courses: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
};

type LessonRow = {
  id: string;
  title: string;
  order: number;
  module_id: string;
  modules: { id: string; title: string; order: number; course_id: string } | null;
};

type CompletionRow = { lesson_id: string };

/**
 * "Continue learning" banner for the student dashboard.
 * Per Nelly's PRD Section 4.
 */
export default async function ContinueLearningBanner() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const workspaceId = await getCurrentWorkspaceId();
  const supabase = await createServerClient();
  const userId = profile.id;

  const { data: enrollment } = await supabase
    .from('student_portal_assignments')
    .select('course_id, courses(id, name, description)')
    .eq('student_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<EnrollmentRow>();

  if (!enrollment?.courses) return null;
  const course = enrollment.courses;
  const courseId = course.id;

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title, order, module_id, modules!inner(id, title, order, course_id)')
    .eq('modules.course_id', courseId)
    .order('order', { ascending: true })
    .returns<LessonRow[]>();

  if (!lessons || lessons.length === 0) return null;

  const moduleOrder = new Map<string, number>();
  lessons.forEach((l) => {
    if (l.modules) moduleOrder.set(l.modules.id, l.modules.order);
  });
  const sortedLessons = [...lessons].sort((a, b) => {
    const aMod = a.modules ? moduleOrder.get(a.modules.id) ?? 0 : 0;
    const bMod = b.modules ? moduleOrder.get(b.modules.id) ?? 0 : 0;
    if (aMod !== bMod) return (aMod ?? 0) - (bMod ?? 0);
    return (a.order ?? 0) - (b.order ?? 0);
  });

  const { data: completions } = await supabase
    .from('lesson_completions')
    .select('lesson_id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .returns<CompletionRow[]>();

  const completedIds = new Set((completions ?? []).map((c) => c.lesson_id));
  const nextLesson =
    sortedLessons.find((l) => !completedIds.has(l.id)) ?? sortedLessons[0];

  const completedCount = sortedLessons.filter((l) => completedIds.has(l.id)).length;
  const totalCount = sortedLessons.length;
  const pct = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return (
    <Link
      href={'/student/courses/' + courseId + '?lesson=' + nextLesson.id}
      className="block group"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A0F3D] to-[#1a237e] p-6 sm:p-8 shadow-lg hover:shadow-xl transition-shadow">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-200 mb-2">
              <BookOpen size={14} aria-hidden />
              Continue Learning
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white truncate mb-1">
              {course.name}
            </h2>
            <p className="text-sm text-blue-100/80 mb-4">
              {nextLesson.modules?.title ? nextLesson.modules.title + ' . ' : ''}
              {nextLesson.title}
            </p>
            <div className="flex items-center gap-3">
              <div
                className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden max-w-xs"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full bg-blue-400 rounded-full transition-all"
                  style={{ width: pct + '%' }}
                />
              </div>
              <span className="text-xs font-semibold text-blue-100">
                {pct}% . {completedCount}/{totalCount}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <span className="inline-flex items-center gap-2 bg-white text-[#0A0F3D] px-6 py-3 rounded-xl font-semibold text-sm group-hover:bg-blue-50 transition-colors">
              {pct === 0 ? 'Start Course' : 'Continue'}
              <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" aria-hidden />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
