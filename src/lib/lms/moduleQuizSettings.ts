import type { createAdminClient } from '@/lib/supabase/server';

type Db = ReturnType<typeof createAdminClient>;

/**
 * The settings every quiz in a module runs with. There is NO per-quiz tier: the module's
 * module_quiz_defaults row is the single source of truth, and a module that has none yet falls
 * back to BUILTIN_QUIZ_SETTINGS. Resolved in ONE place so the student quiz page, the attempt
 * action, the grader, manual review and course completion can never disagree.
 *
 * module_quiz_settings (the old per-quiz rows) is kept in the database as a historical record
 * but is deliberately never read here — see migration 20261001000002.
 */
export interface EffectiveQuizSettings {
  /** 0-100 */
  passPercentage: number;
  /** minutes; 0 = no limit */
  timeLimitMinutes: number;
  /** total attempts allowed; -1 = unlimited */
  maxAttempts: number;
  randomizeQuestions: boolean;
  /** must be passed to complete the course */
  isRequired: boolean;
  /** 'module' = configured on the module, 'builtin' = the module has no settings yet */
  source: 'module' | 'builtin';
}

export const BUILTIN_QUIZ_SETTINGS: EffectiveQuizSettings = {
  passPercentage: 70,
  timeLimitMinutes: 0,
  maxAttempts: -1,
  randomizeQuestions: false,
  isRequired: true,
  source: 'builtin',
};

export interface ModuleQuizDefaultsRow {
  module_id: string;
  pass_percentage: number | null;
  time_limit_minutes: number | null;
  max_attempts: number | null;
  randomize_questions: boolean | null;
  is_required: boolean | null;
}

export function resolveModuleQuizSettings(defaults: ModuleQuizDefaultsRow | null | undefined): EffectiveQuizSettings {
  if (!defaults) return { ...BUILTIN_QUIZ_SETTINGS };
  return {
    passPercentage: defaults.pass_percentage ?? BUILTIN_QUIZ_SETTINGS.passPercentage,
    timeLimitMinutes: Math.max(0, defaults.time_limit_minutes ?? 0),
    // 0 / negatives other than -1 are meaningless caps; treat them as unlimited.
    maxAttempts: defaults.max_attempts == null || defaults.max_attempts <= 0 ? -1 : defaults.max_attempts,
    randomizeQuestions: !!defaults.randomize_questions,
    isRequired: defaults.is_required ?? true,
    source: 'module',
  };
}

/** The module's settings row, or null when the instructor never configured one. */
export async function getModuleQuizDefaults(db: Db, moduleId: string): Promise<ModuleQuizDefaultsRow | null> {
  const { data, error } = await db.from('module_quiz_defaults').select('*').eq('module_id', moduleId).maybeSingle();
  if (error) throw error;
  return data as ModuleQuizDefaultsRow | null;
}

/** Effective settings for many quizzes at once (one query, however many quizzes). */
export async function getEffectiveQuizSettings(
  db: Db,
  quizzes: { id: string; module_id: string }[],
): Promise<Map<string, EffectiveQuizSettings>> {
  const out = new Map<string, EffectiveQuizSettings>();
  if (quizzes.length === 0) return out;

  const moduleIds = Array.from(new Set(quizzes.map((q) => q.module_id)));
  const { data, error } = await db.from('module_quiz_defaults').select('*').in('module_id', moduleIds);
  if (error) throw error;

  const defaultsByModule = new Map<string, ModuleQuizDefaultsRow>((data || []).map((d: any) => [d.module_id, d]));
  for (const q of quizzes) out.set(q.id, resolveModuleQuizSettings(defaultsByModule.get(q.module_id)));
  return out;
}

export async function getEffectiveQuizSettingsFor(
  db: Db,
  quiz: { id: string; module_id: string },
): Promise<EffectiveQuizSettings> {
  return (await getEffectiveQuizSettings(db, [quiz])).get(quiz.id) ?? { ...BUILTIN_QUIZ_SETTINGS };
}
