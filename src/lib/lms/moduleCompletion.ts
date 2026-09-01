import { createAdminClient } from '@/lib/supabase/server';

export interface ModuleCompletionStatus {
  totalLessons: number;
  completedLessons: number;
  allComplete: boolean;
}

// Module-Level Quiz — Step 3 access-timing decision: a module quiz is a capstone assessment
// for that module's material, so a student can only take it after completing every lesson in
// the module. Reuses the real, existing per-lesson completion tracking (course_progress —
// the same table markLessonCompleteForContact/markLessonComplete already write to for every
// other completion path in this codebase) rather than introducing a new module-level
// "completed" flag. A module with zero lessons is treated as complete (nothing to block on)
// rather than permanently locking the quiz.
export async function getModuleCompletionStatus(
  contactId: string,
  moduleId: string
): Promise<ModuleCompletionStatus> {
  const adminClient = createAdminClient();

  const { data: lessons } = await adminClient
    .from('course_lessons')
    .select('id')
    .eq('module_id', moduleId)
    .eq('is_active', true);

  const lessonIds = (lessons || []).map((l) => l.id);
  const totalLessons = lessonIds.length;

  if (totalLessons === 0) {
    return { totalLessons: 0, completedLessons: 0, allComplete: true };
  }

  // A completion is a course_progress row WITH completed_at set. The player heartbeat also
  // writes completed_at:null rows purely to remember a video's playback position; those are
  // not completions and must not unlock the module quiz.
  const { data: progress } = await adminClient
    .from('course_progress')
    .select('lesson_id')
    .eq('contact_id', contactId)
    .not('completed_at', 'is', null)
    .in('lesson_id', lessonIds);

  const completedLessons = new Set((progress || []).map((p) => p.lesson_id)).size;

  return { totalLessons, completedLessons, allComplete: completedLessons >= totalLessons };
}
