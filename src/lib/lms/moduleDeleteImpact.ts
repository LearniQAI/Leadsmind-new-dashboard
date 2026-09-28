// What deleting a module would destroy, so the admin sees the stakes before confirming.
// Deleting a module cascades to its lessons and, through them, to every student's progress on those lessons.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface ModuleDeleteImpact {
  moduleId: string;
  title: string;
  courseId: string;
  lessons: number;
  /** Distinct students with any progress row on this module's lessons. */
  students: number;
  /** Progress rows that would be deleted (completions plus in-progress position markers). */
  progressRows: number;
}

/** Returns null when the module does not exist in this workspace. */
export async function getModuleDeleteImpact(
  db: SupabaseClient,
  args: { workspaceId: string; moduleId: string }
): Promise<ModuleDeleteImpact | null> {
  const { data: mod, error } = await db
    .from('course_modules')
    .select('id, title, course_id')
    .eq('id', args.moduleId)
    .eq('workspace_id', args.workspaceId)
    .maybeSingle();
  if (error) throw error;
  if (!mod) return null;

  const { data: lessons, error: lessonsErr } = await db.from('course_lessons').select('id').eq('module_id', mod.id);
  if (lessonsErr) throw lessonsErr;
  const lessonIds = (lessons || []).map((l: any) => l.id);

  let progressRows = 0;
  const students = new Set<string>();
  if (lessonIds.length > 0) {
    // Paged so a large module can't be silently truncated at PostgREST's row cap.
    for (let from = 0; ; from += 1000) {
      const { data, error: progErr } = await db
        .from('course_progress')
        .select('contact_id')
        .in('lesson_id', lessonIds)
        .order('id')
        .range(from, from + 999);
      if (progErr) throw progErr;
      for (const r of data || []) { progressRows++; students.add((r as any).contact_id); }
      if (!data || data.length < 1000) break;
    }
  }

  return { moduleId: mod.id, title: mod.title, courseId: mod.course_id, lessons: lessonIds.length, students: students.size, progressRows };
}

export function describeDeleteImpact(i: Pick<ModuleDeleteImpact, 'lessons' | 'students' | 'progressRows'>): string {
  const lessons = `${i.lessons} lesson${i.lessons === 1 ? '' : 's'}`;
  if (i.progressRows === 0) return `This permanently deletes the module and its ${lessons}. No student has progress in it. This cannot be undone.`;
  return `This permanently deletes the module, its ${lessons}, and ${i.progressRows} progress record${i.progressRows === 1 ? '' : 's'} from ${i.students} student${i.students === 1 ? '' : 's'}. Their completion of these lessons will be lost and course percentages will change. This cannot be undone.`;
}
