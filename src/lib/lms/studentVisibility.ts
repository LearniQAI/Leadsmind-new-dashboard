// What a STUDENT (or any non-staff viewer) may see of a module.
//
// The PRD lifecycle is DRAFT -> PUBLISHED <-> INACTIVE. DRAFT and INACTIVE are hidden from students.
// 'coming_soon' sits outside that three-state model and stays visible-but-locked, exactly as before.
//
//   visible  = is_active AND publish_status IN ('published', 'coming_soon')
//   hidden   = INACTIVE (is_active = false) or DRAFT (draft / null / anything unrecognised)
//
// Unknown or null publish_status is treated as hidden (fail closed), matching deriveModuleStatus().
// Staff previews (instructor builder preview, lesson video for staff) deliberately do not use this.

import type { SupabaseClient } from '@supabase/supabase-js';

export const STUDENT_VISIBLE_PUBLISH_STATUSES = ['published', 'coming_soon'] as const;

export function isModuleStudentVisible(m: { is_active: boolean | null; publish_status: string | null }): boolean {
  return m.is_active !== false && (STUDENT_VISIBLE_PUBLISH_STATUSES as readonly string[]).includes(m.publish_status ?? '');
}

/** Adds the student-visibility filter to a course_modules query builder. */
export function whereModuleStudentVisible<T extends { eq: (c: string, v: any) => T; in: (c: string, v: any[]) => T }>(q: T): T {
  return q.eq('is_active', true).in('publish_status', [...STUDENT_VISIBLE_PUBLISH_STATUSES]);
}

/** Of the given lesson ids, the ones a student may see: an active lesson inside a student-visible module. */
export async function filterStudentVisibleLessonIds(db: SupabaseClient, lessonIds: string[]): Promise<Set<string>> {
  if (lessonIds.length === 0) return new Set();
  const { data, error } = await db
    .from('course_lessons')
    .select('id, is_active, module:course_modules(is_active, publish_status)')
    .in('id', lessonIds);
  if (error) throw error;
  const visible = new Set<string>();
  for (const l of (data || []) as any[]) {
    const mod = Array.isArray(l.module) ? l.module[0] : l.module;
    if (l.is_active !== false && mod && isModuleStudentVisible(mod)) visible.add(l.id);
  }
  return visible;
}

export async function isLessonStudentVisible(db: SupabaseClient, lessonId: string): Promise<boolean> {
  return (await filterStudentVisibleLessonIds(db, [lessonId])).has(lessonId);
}
