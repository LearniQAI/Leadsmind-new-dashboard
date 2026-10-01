'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { loadModuleQuizForWorkspace } from '@/lib/lms/moduleQuizzes';
import { logger } from '@/shared/logger';

// Instructor CRUD for module quizzes. A module can hold any number of quizzes
// (module_quizzes, migration 20260930000015); each has its own questions, settings and
// attempts keyed by quiz_id. Every action resolves the workspace from the session and checks
// the module or quiz belongs to it before touching anything (service-role client).

export interface ModuleQuizListItem {
  id: string;
  title: string;
  status: 'draft' | 'published';
  position: number;
  questionCount: number;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
}

async function loadModuleInWorkspace(db: ReturnType<typeof createAdminClient>, moduleId: string, workspaceId: string) {
  const { data, error } = await db
    .from('course_modules')
    .select('id, course_id, title')
    .eq('id', moduleId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listModuleQuizzes(moduleId: string): Promise<{ data?: ModuleQuizListItem[]; error?: string }> {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const db = createAdminClient();
    if (!(await loadModuleInWorkspace(db, moduleId, workspaceId))) return { error: 'Module not found.' };

    const { data: quizzes, error } = await db
      .from('module_quizzes')
      .select('id, title, status, position, created_at, updated_at')
      .eq('module_id', moduleId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;

    const ids = (quizzes || []).map((q: any) => q.id);
    const [questionsRes, attemptsRes] = ids.length
      ? await Promise.all([
          db.from('module_quiz_questions').select('quiz_id').in('quiz_id', ids),
          db.from('module_quiz_attempts').select('quiz_id').in('quiz_id', ids),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];
    if (questionsRes.error) throw questionsRes.error;
    if (attemptsRes.error) throw attemptsRes.error;

    const count = (rows: any[] | null) => {
      const m = new Map<string, number>();
      for (const r of rows || []) m.set(r.quiz_id, (m.get(r.quiz_id) || 0) + 1);
      return m;
    };
    const questionCounts = count(questionsRes.data);
    const attemptCounts = count(attemptsRes.data);

    return {
      data: (quizzes || []).map((q: any) => ({
        id: q.id,
        title: q.title,
        status: q.status,
        position: q.position,
        questionCount: questionCounts.get(q.id) || 0,
        attemptCount: attemptCounts.get(q.id) || 0,
        createdAt: q.created_at,
        updatedAt: q.updated_at,
      })),
    };
  } catch (err: any) {
    logger.error({ err, moduleId }, 'module_quizzes.list.failed');
    return { error: 'Could not load quizzes.' };
  }
}

export async function createModuleQuiz(moduleId: string, title?: string): Promise<{ data?: { id: string }; error?: string }> {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const db = createAdminClient();
    const courseModule = await loadModuleInWorkspace(db, moduleId, workspaceId);
    if (!courseModule) return { error: 'Module not found.' };

    const { data: existing, error: exErr } = await db
      .from('module_quizzes')
      .select('position')
      .eq('module_id', moduleId)
      .order('position', { ascending: false })
      .limit(1);
    if (exErr) throw exErr;
    const nextPosition = existing?.length ? (existing[0].position ?? 0) + 1 : 0;

    const cleanTitle = (title || '').trim() || `Quiz ${nextPosition + 1}`;

    const { data: quiz, error } = await db
      .from('module_quizzes')
      .insert({ module_id: moduleId, workspace_id: workspaceId, title: cleanTitle, status: 'draft', position: nextPosition })
      .select('id')
      .single();
    if (error) throw error;

    revalidatePath(`/courses/${courseModule.course_id}/module-quiz/${moduleId}`);
    return { data: { id: quiz.id } };
  } catch (err: any) {
    logger.error({ err, moduleId }, 'module_quizzes.create.failed');
    return { error: 'Could not create the quiz.' };
  }
}

export async function updateModuleQuiz(
  quizId: string,
  patch: { title?: string; status?: 'draft' | 'published' },
): Promise<{ success?: true; error?: string }> {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const db = createAdminClient();
    const quiz = await loadModuleQuizForWorkspace(db, quizId, workspaceId);
    if (!quiz) return { error: 'Quiz not found.' };

    const update: Record<string, any> = { updated_at: new Date().toISOString() };
    if (patch.title !== undefined) {
      const t = patch.title.trim();
      if (!t) return { error: 'Quiz title is required.' };
      update.title = t;
    }
    if (patch.status !== undefined) {
      if (patch.status !== 'draft' && patch.status !== 'published') return { error: 'Invalid status.' };
      if (patch.status === 'published') {
        const { count, error: cErr } = await db
          .from('module_quiz_questions')
          .select('id', { count: 'exact', head: true })
          .eq('quiz_id', quizId);
        if (cErr) throw cErr;
        if (!count) return { error: 'Add at least one question before publishing this quiz.' };
      }
      update.status = patch.status;
    }

    const { error } = await db.from('module_quizzes').update(update).eq('id', quizId).eq('workspace_id', workspaceId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    logger.error({ err, quizId }, 'module_quizzes.update.failed');
    return { error: 'Could not update the quiz.' };
  }
}

// ---- Module quiz settings -------------------------------------------------------------------
// One module_quiz_defaults row per module: the ONLY source of grading/pacing/completion rules for
// every quiz in the module (there is no per-quiz override). See moduleQuizSettings.ts. Field set =
// exactly what the student side enforces.

export interface ModuleQuizRules {
  passPercentage: number;
  /** minutes, 0 = no limit */
  timeLimitMinutes: number;
  /** total attempts, -1 = unlimited */
  maxAttempts: number;
  randomizeQuestions: boolean;
  isRequired: boolean;
}

export interface ModuleQuizSettingsOverview {
  /** null until the instructor saves module settings for the first time */
  defaults: ModuleQuizRules | null;
  quizzes: { id: string; title: string; status: 'draft' | 'published' }[];
}

function validateRules(r: ModuleQuizRules): string | null {
  const int = (n: unknown) => typeof n === 'number' && Number.isInteger(n);
  if (!int(r.passPercentage) || r.passPercentage < 0 || r.passPercentage > 100) return 'Passing score must be between 0 and 100.';
  if (!int(r.timeLimitMinutes) || r.timeLimitMinutes < 0 || r.timeLimitMinutes > 600) return 'Time limit must be between 0 and 600 minutes.';
  if (!int(r.maxAttempts) || (r.maxAttempts !== -1 && (r.maxAttempts < 1 || r.maxAttempts > 100))) {
    return 'Max attempts must be unlimited or between 1 and 100.';
  }
  return null;
}

export async function getModuleQuizSettingsOverview(moduleId: string): Promise<{ data?: ModuleQuizSettingsOverview; error?: string }> {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const db = createAdminClient();
    if (!(await loadModuleInWorkspace(db, moduleId, workspaceId))) return { error: 'Module not found.' };

    const [defaultsRes, quizzesRes] = await Promise.all([
      db.from('module_quiz_defaults').select('*').eq('module_id', moduleId).maybeSingle(),
      db.from('module_quizzes').select('id, title, status, position, created_at').eq('module_id', moduleId)
        .order('position', { ascending: true }).order('created_at', { ascending: true }),
    ]);
    if (defaultsRes.error) throw defaultsRes.error;
    if (quizzesRes.error) throw quizzesRes.error;

    const d = defaultsRes.data as any;
    return {
      data: {
        defaults: d
          ? {
              passPercentage: d.pass_percentage,
              timeLimitMinutes: d.time_limit_minutes ?? 0,
              maxAttempts: d.max_attempts,
              randomizeQuestions: !!d.randomize_questions,
              isRequired: d.is_required,
            }
          : null,
        quizzes: (quizzesRes.data || []).map((q: any) => ({ id: q.id, title: q.title, status: q.status })),
      },
    };
  } catch (err: any) {
    logger.error({ err, moduleId }, 'module_quiz_defaults.overview.failed');
    return { error: 'Could not load the module quiz settings.' };
  }
}

export async function saveModuleQuizDefaults(moduleId: string, rules: ModuleQuizRules): Promise<{ success?: true; error?: string }> {
  try {
    const invalid = validateRules(rules);
    if (invalid) return { error: invalid };
    const { workspaceId } = await requireLmsInstructor();
    const db = createAdminClient();
    const courseModule = await loadModuleInWorkspace(db, moduleId, workspaceId);
    if (!courseModule) return { error: 'Module not found.' };

    const { error } = await db.from('module_quiz_defaults').upsert(
      {
        module_id: moduleId,
        workspace_id: workspaceId,
        pass_percentage: rules.passPercentage,
        time_limit_minutes: rules.timeLimitMinutes,
        max_attempts: rules.maxAttempts,
        randomize_questions: !!rules.randomizeQuestions,
        is_required: !!rules.isRequired,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'module_id' },
    );
    if (error) throw error;
    revalidatePath(`/courses/${courseModule.course_id}/module-quiz/${moduleId}`);
    return { success: true };
  } catch (err: any) {
    logger.error({ err, moduleId }, 'module_quiz_defaults.save.failed');
    return { error: 'Could not save the module quiz settings.' };
  }
}

/**
 * Deletes the quiz with its questions (FK cascade). Student attempts are kept as
 * history with quiz_id set to NULL, and a deleted quiz is no longer required for completion.
 */
export async function deleteModuleQuiz(quizId: string): Promise<{ success?: true; error?: string }> {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const db = createAdminClient();
    const quiz = await loadModuleQuizForWorkspace(db, quizId, workspaceId);
    if (!quiz) return { error: 'Quiz not found.' };

    const { error } = await db.from('module_quizzes').delete().eq('id', quizId).eq('workspace_id', workspaceId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    logger.error({ err, quizId }, 'module_quizzes.delete.failed');
    return { error: 'Could not delete the quiz.' };
  }
}
