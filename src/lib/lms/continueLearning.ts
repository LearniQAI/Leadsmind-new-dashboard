// One definition of "course order", "course progress %" and "where do I continue" for a student.
//
// - Order is module.position, then lesson.position, then id. Lesson positions restart inside every
//   module, so lessons must NEVER be ordered by lesson.position alone.
// - Visibility matches exactly what the student player shows: an active lesson in a PUBLISHED (or
//   locked coming_soon) module. DRAFT and INACTIVE modules are hidden from students.
// - Everything is scoped to ONE course: pass in only that course's modules/lessons/progress.
// - Progress is keyed by lesson id only, so reordering modules or lessons cannot change it.
//
// Continue target:
//   1. the lesson the student was last on (enrollments.last_lesson_id), if it is in this course, still
//      visible and NOT yet completed — a reorder never moves them off a lesson they are part-way through;
//   2. otherwise the first incomplete lesson in the current course order (so once the in-progress lesson
//      is completed, navigation follows the new order).

import type { createAdminClient } from '@/lib/supabase/server';
import { isModuleStudentVisible } from '@/lib/lms/studentVisibility';

export interface OrderModule { id: string; position: number | null; is_active: boolean | null; publish_status?: string | null; title?: string | null }
export interface OrderLesson { id: string; module_id: string | null; position: number | null; is_active: boolean | null; title?: string | null }

export interface OrderedLesson<L extends OrderLesson = OrderLesson> {
  lesson: L;
  moduleId: string;
  moduleNumber: number;
  lessonNumber: number;
}

export function orderCourseLessons<M extends OrderModule, L extends OrderLesson>(modules: M[], lessons: L[]): OrderedLesson<L>[] {
  const byPos = (a: { position: number | null; id: string }, b: { position: number | null; id: string }) =>
    (a.position ?? 0) - (b.position ?? 0) || a.id.localeCompare(b.id);

  // Same rule as the player: DRAFT and INACTIVE modules are invisible to students (studentVisibility.ts).
  const activeModules = modules.filter((m) => isModuleStudentVisible({ is_active: m.is_active, publish_status: m.publish_status ?? null })).sort(byPos);
  const out: OrderedLesson<L>[] = [];
  activeModules.forEach((m, mi) => {
    lessons
      .filter((l) => l.module_id === m.id && l.is_active !== false)
      .sort(byPos)
      .forEach((lesson, li) => out.push({ lesson, moduleId: m.id, moduleNumber: mi + 1, lessonNumber: li + 1 }));
  });
  return out;
}

export type ProgressState = 'not_started' | 'in_progress' | 'complete';

export interface CourseResolution {
  state: ProgressState;
  totalLessons: number;
  completedLessons: number;
  percentage: number;
  target: { lessonId: string; moduleId: string; moduleNumber: number; lessonNumber: number; title: string | null } | null;
  /** e.g. "68% → Continue at Module 2, Lesson 3", "Not Started", "100% → Completed" */
  label: string;
}

export function resolveContinueLearning(input: {
  modules: OrderModule[];
  lessons: OrderLesson[];
  completedLessonIds: Iterable<string>;
  lastLessonId?: string | null;
}): CourseResolution {
  const ordered = orderCourseLessons(input.modules, input.lessons);
  const done = new Set(input.completedLessonIds);
  const total = ordered.length;
  const completed = ordered.filter((o) => done.has(o.lesson.id)).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const last = input.lastLessonId ? ordered.find((o) => o.lesson.id === input.lastLessonId) : undefined;
  const pick = last && !done.has(last.lesson.id) ? last : ordered.find((o) => !done.has(o.lesson.id));

  if (total > 0 && completed === total) {
    return { state: 'complete', totalLessons: total, completedLessons: completed, percentage, target: null, label: '100% → Completed' };
  }
  const target = pick
    ? { lessonId: pick.lesson.id, moduleId: pick.moduleId, moduleNumber: pick.moduleNumber, lessonNumber: pick.lessonNumber, title: pick.lesson.title ?? null }
    : null;
  const started = completed > 0 || !!last;
  return {
    state: started ? 'in_progress' : 'not_started',
    totalLessons: total,
    completedLessons: completed,
    percentage,
    target,
    label: !started || !target ? 'Not Started' : `${percentage}% → Continue at Module ${target.moduleNumber}, Lesson ${target.lessonNumber}`,
  };
}

type Db = ReturnType<typeof createAdminClient>;

/**
 * Resolves many courses for one student (all of their contact ids, since a student has one contact per
 * workspace). Each course only ever sees its own modules, lessons and progress rows.
 */
export async function loadCourseResolutions(
  db: Db,
  args: { contactIds: string[]; courseIds: string[]; lastLessonByCourse?: Record<string, string | null | undefined> }
): Promise<Map<string, CourseResolution>> {
  const result = new Map<string, CourseResolution>();
  if (args.courseIds.length === 0) return result;

  const [modulesRes, lessonsRes, progressRes] = await Promise.all([
    db.from('course_modules').select('id, course_id, position, is_active, publish_status, title').in('course_id', args.courseIds),
    db.from('course_lessons').select('id, course_id, module_id, position, is_active, title').in('course_id', args.courseIds),
    args.contactIds.length
      ? db.from('course_progress').select('course_id, lesson_id').in('course_id', args.courseIds).in('contact_id', args.contactIds).not('completed_at', 'is', null)
      : Promise.resolve({ data: [], error: null } as any),
  ]);
  for (const r of [modulesRes, lessonsRes, progressRes]) if (r.error) throw r.error;

  const group = <T extends { course_id: string }>(rows: T[] | null) => {
    const m = new Map<string, T[]>();
    for (const r of rows || []) (m.get(r.course_id) ?? m.set(r.course_id, []).get(r.course_id)!).push(r);
    return m;
  };
  const mods = group(modulesRes.data as any[]);
  const less = group(lessonsRes.data as any[]);
  const prog = group(progressRes.data as any[]);

  for (const courseId of args.courseIds) {
    result.set(
      courseId,
      resolveContinueLearning({
        modules: mods.get(courseId) || [],
        lessons: less.get(courseId) || [],
        completedLessonIds: (prog.get(courseId) || []).map((p: any) => p.lesson_id),
        lastLessonId: args.lastLessonByCourse?.[courseId],
      })
    );
  }
  return result;
}
