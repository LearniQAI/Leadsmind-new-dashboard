import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';

/**
 * Pure ordering + selection logic, kept separate from the DB I/O below so it can be
 * unit-tested without a Supabase client. Real course-wide order: module position first,
 * lesson position within the module second — the same two-key sort lock-utils.ts's
 * siblingLessons/moduleIndex logic relies on.
 */
export function computePreviewLessonIds(
  modules: { id: string; position: number | null }[],
  lessons: { id: string; module_id: string; position: number | null }[],
  freeLessonCount: number
): Set<string> {
  const moduleOrder = new Map(
    [...modules].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((m, idx) => [m.id, idx])
  );
  const ordered = [...lessons].sort((a, b) => {
    const ma = moduleOrder.get(a.module_id) ?? 0;
    const mb = moduleOrder.get(b.module_id) ?? 0;
    if (ma !== mb) return ma - mb;
    return (a.position ?? 0) - (b.position ?? 0);
  });
  return new Set(ordered.slice(0, Math.max(0, freeLessonCount)).map((l) => l.id));
}

/**
 * Course Start Method 3 (free preview lessons, then paywall).
 *
 * course_lessons.is_preview used to be purely decorative — hand-flagged per lesson via
 * LessonSettingsModal, read only by the marketing landing page as a badge, never checked by
 * the real student player. For a course on start_method = 'free_preview_then_paywall',
 * is_preview is instead DERIVED, automatically, from real course-wide lesson position vs.
 * the admin's single "Free lessons before payment required" number (free_lesson_count) —
 * matching exactly how lock-utils.ts already orders lessons for drip/sequential locking
 * (module position, then lesson position within the module), rather than building a second,
 * parallel access-control ordering.
 *
 * For every OTHER start_method, is_preview is left alone — it stays the existing, independent,
 * hand-flagged marketing field. This function is a no-op for those courses.
 */
export async function recomputeCoursePreviewLessons(courseId: string): Promise<void> {
  try {
    const admin = createAdminClient();

    const { data: course } = await admin
      .from('courses')
      .select('id, start_method, free_lesson_count')
      .eq('id', courseId)
      .maybeSingle();

    if (!course || course.start_method !== 'free_preview_then_paywall') return;

    const freeCount = course.free_lesson_count;
    if (freeCount == null) {
      // No free-lesson count configured yet — nothing is a paid-model preview lesson.
      // (Does not touch is_preview at all if this course was never on this method — guarded
      // above — so this only clears the derived state for a course genuinely on Method 3
      // with no count set.)
      await admin.from('course_lessons').update({ is_preview: false }).eq('course_id', courseId);
      return;
    }

    const [{ data: modules }, { data: lessons }] = await Promise.all([
      admin.from('course_modules').select('id, position').eq('course_id', courseId).order('position', { ascending: true }),
      admin.from('course_lessons').select('id, module_id, position').eq('course_id', courseId).order('position', { ascending: true }),
    ]);

    const previewIds = computePreviewLessonIds(modules || [], lessons || [], freeCount);

    // Two real writes (rather than one N-case CASE-WHEN) — course lesson counts here are small
    // (tens, not thousands), and this keeps the logic identical to/readable against the plain
    // "position <= N" statement above instead of hiding it in SQL.
    const previewIdList = Array.from(previewIds);
    const nonPreviewIdList = (lessons || []).filter((l: any) => !previewIds.has(l.id)).map((l: any) => l.id);

    await Promise.all([
      previewIdList.length
        ? admin.from('course_lessons').update({ is_preview: true }).in('id', previewIdList)
        : Promise.resolve(),
      nonPreviewIdList.length
        ? admin.from('course_lessons').update({ is_preview: false }).in('id', nonPreviewIdList)
        : Promise.resolve(),
    ]);
  } catch (err) {
    logger.error({ err, courseId }, 'course_preview.recompute.failed');
  }
}
