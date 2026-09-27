import type { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';

type Db = ReturnType<typeof createAdminClient>;

export interface StudentModuleQuiz {
  id: string;
  module_id: string;
  title: string;
  position: number;
}

/**
 * The module quizzes a student can see and must pass: status 'published' AND at least one
 * question. A module can hold any number of quizzes (module_quizzes, migration
 * 20260930000015); a draft or an empty quiz is invisible to students and never blocks course
 * completion. Every student-facing reader (course player, sidebar, quiz pages, completion)
 * goes through this one definition.
 */
export async function getStudentVisibleModuleQuizzes(db: Db, moduleIds: string[]): Promise<StudentModuleQuiz[]> {
  if (moduleIds.length === 0) return [];

  const { data: quizzes, error } = await db
    .from('module_quizzes')
    .select('id, module_id, title, position, created_at')
    .in('module_id', moduleIds)
    .eq('status', 'published')
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  if (!quizzes?.length) return [];

  const { data: questions, error: qErr } = await db
    .from('module_quiz_questions')
    .select('quiz_id')
    .in('quiz_id', quizzes.map((q: any) => q.id));
  if (qErr) throw qErr;

  const withQuestions = new Set((questions || []).map((q: any) => q.quiz_id));
  return quizzes
    .filter((q: any) => withQuestions.has(q.id))
    .map((q: any) => ({ id: q.id, module_id: q.module_id, title: q.title, position: q.position }));
}

/**
 * Loads a module quiz the caller's workspace owns (service-role client). Every instructor route
 * that takes a quiz id resolves it through here, so module_id is always derived from the quiz,
 * never trusted from the request.
 */
export async function loadModuleQuizForWorkspace(db: Db, quizId: string | null | undefined, workspaceId: string) {
  if (!quizId) return null;
  const { data, error } = await db
    .from('module_quizzes')
    .select('id, module_id, title, status')
    .eq('id', quizId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Bumps a quiz's updated_at so the list page's "last edited" reflects question/settings edits. */
export async function touchModuleQuiz(db: Db, quizId: string): Promise<void> {
  const { error } = await db.from('module_quizzes').update({ updated_at: new Date().toISOString() }).eq('id', quizId);
  if (error) logger.error({ err: error, quizId }, 'module_quizzes.touch.failed');
}

/** quiz id -> title, for labelling module-quiz attempts (a module can hold several quizzes). */
export async function getModuleQuizTitles(db: Db, quizIds: (string | null | undefined)[]): Promise<Map<string, string>> {
  const ids = Array.from(new Set(quizIds.filter((id): id is string => !!id)));
  if (ids.length === 0) return new Map();
  const { data, error } = await db.from('module_quizzes').select('id, title').in('id', ids);
  if (error) throw error;
  return new Map((data || []).map((q: any) => [q.id, q.title]));
}

/** Groups quizzes by module_id, keeping their order. */
export function groupQuizzesByModule(quizzes: StudentModuleQuiz[]): Map<string, StudentModuleQuiz[]> {
  const byModule = new Map<string, StudentModuleQuiz[]>();
  for (const q of quizzes) {
    const list = byModule.get(q.module_id) || [];
    list.push(q);
    byModule.set(q.module_id, list);
  }
  return byModule;
}

/**
 * Sets `module_quizzes` (the student-visible quizzes, in order) and `has_module_quiz` on each
 * module row for the syllabus sidebar and the lesson player.
 */
export async function attachStudentModuleQuizzes(db: Db, modules: any[]): Promise<void> {
  const byModule = groupQuizzesByModule(await getStudentVisibleModuleQuizzes(db, modules.map((m) => m.id)));
  for (const m of modules) {
    m.module_quizzes = (byModule.get(m.id) || []).map((q) => ({ id: q.id, title: q.title }));
    m.has_module_quiz = m.module_quizzes.length > 0;
  }
}
