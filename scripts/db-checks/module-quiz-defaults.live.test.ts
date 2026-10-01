// Live verification: module quiz settings are the ONLY source of quiz rules (no per-quiz override).
// REAL database, throwaway workspace (removed with liveCleanup). Auth is stubbed to the throwaway
// workspace/student; everything else is the real code: the instructor actions, the student submit
// action (grading + attempt cap) and course completion.
//
// The three quizzes carry LEGACY per-quiz settings rows (A = 90% / 2 attempts, B = 50% / 1 attempt,
// C = none) — exactly the live-data situation. They must be preserved in the database and never read.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';

const runId = randomUUID().slice(0, 8);
let db: any, ws = '', course = '', mod = '', contact = '', lesson = '';
const userIds: string[] = [];
type K = 'A' | 'B' | 'C';
const Q: Record<K, string> = { A: '', B: '', C: '' };
const qids: Record<string, string[]> = {};

vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock('@/lib/lms/access', () => ({ requireLmsInstructor: async () => ({ workspaceId: ws, userId: 'live' }) }));
vi.mock('@/lib/auth', async (orig) => ({ ...(await orig<any>()), getUser: async () => ({ id: 'live-student' }) }));
vi.mock('@/app/actions/studentEnrollments', () => ({ getOrCreateStudentContact: async () => contact }));
vi.mock('@/lib/lms/courseCompletionEvent', () => ({ maybeFireCourseCompleted: async () => {} }));
vi.mock('../../libs/core/src/events/lms-event-bus', () => ({ emitLMSEvent: async () => {} }));

const must = (r: any, what: string) => { if (r.error || !r.data) throw new Error(`${what}: ${r.error?.message ?? 'no row'}`); return r.data; };

// Two questions, so one right answer = 50%.
const answers = (key: K, rightCount: number) => ({
  [qids[key][0]]: rightCount >= 1 ? 'Right' : 'Wrong',
  [qids[key][1]]: rightCount >= 2 ? 'Right' : 'Wrong',
});
async function effective(key: K) {
  const { getEffectiveQuizSettingsFor } = await import('@/lib/lms/moduleQuizSettings');
  return getEffectiveQuizSettingsFor(db, { id: Q[key], module_id: mod });
}
async function submit(key: K, rightCount: number) {
  const { submitModuleQuizAttempt } = await import('@/app/actions/studentProgress');
  return submitModuleQuizAttempt({ courseId: course, quizId: Q[key], answers: answers(key, rightCount) });
}
async function completion() {
  const { getCourseCompletionStatus } = await import('@/lib/lms/courseCompletion');
  return getCourseCompletionStatus(db, contact, course);
}
const rulesOf = (e: any) => ({ pass: e.passPercentage, time: e.timeLimitMinutes, attempts: e.maxAttempts, shuffle: e.randomizeQuestions, required: e.isRequired });

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  db = (await import('@/lib/supabase/server')).createAdminClient();
  await sweepStaleTestWorkspaces(db, testRunPatterns('mqdef'));

  const email = `mqdef-${runId}-owner@example.com`;
  const { data, error } = await db.auth.admin.createUser({ email, password: randomUUID(), email_confirm: true });
  if (error) throw new Error(error.message);
  userIds.push(data.user.id);
  await new Promise((r) => setTimeout(r, 1200));
  ws = (await db.from('workspace_members').select('workspace_id').eq('user_id', data.user.id).single()).data.workspace_id;

  course = must(await db.from('courses').insert({ workspace_id: ws, title: `MQ ${runId}`, status: 'published', pricing_model: 'free', slug: `mq-${runId}` }).select('id').single(), 'course').id;
  mod = must(await db.from('course_modules').insert({ course_id: course, workspace_id: ws, title: 'Intro', publish_status: 'published' }).select('id').single(), 'module').id;
  lesson = must(await db.from('course_lessons').insert({ module_id: mod, course_id: course, workspace_id: ws, title: 'L1', lesson_type: 'text', position: 1 }).select('id').single(), 'lesson').id;
  contact = must(await db.from('contacts').insert({ workspace_id: ws, email: `mqdef-${runId}-student@example.com`, first_name: 'S', last_name: 'T' }).select('id').single(), 'contact').id;
  must(await db.from('enrollments').insert({ course_id: course, contact_id: contact }).select('id').single(), 'enrollment');
  must(await db.from('course_progress').insert({ course_id: course, contact_id: contact, lesson_id: lesson, workspace_id: ws, completed_at: new Date().toISOString() }).select('lesson_id').single(), 'progress');

  for (const [i, key] of (['A', 'B', 'C'] as const).entries()) {
    Q[key] = must(await db.from('module_quizzes').insert({ module_id: mod, workspace_id: ws, title: `Quiz ${key}`, status: 'published', position: i }).select('id').single(), `quiz ${key}`).id;
    qids[key] = [];
    for (let p = 0; p < 2; p++) {
      qids[key].push(must(await db.from('module_quiz_questions').insert({
        module_id: mod, quiz_id: Q[key], workspace_id: ws, question_type: 'mcq', question_text: `q${p}`, position: p, points: 1,
        options: [{ text: 'Right' }, { text: 'Wrong' }], correct_answer: { correct_option_index: 0 },
      }).select('id').single(), 'question').id);
    }
  }
  // LEGACY per-quiz rows, as they exist on prod today.
  must(await db.from('module_quiz_settings').insert({ quiz_id: Q.A, module_id: mod, pass_percentage: 90, max_attempts: 2, time_limit_minutes: 5, randomize_questions: true, is_required: true, inherit_module_defaults: false }).select('id').single(), 'settings A');
  must(await db.from('module_quiz_settings').insert({ quiz_id: Q.B, module_id: mod, pass_percentage: 50, max_attempts: 1, time_limit_minutes: 0, randomize_questions: false, is_required: false, inherit_module_defaults: false }).select('id').single(), 'settings B');
});

afterAll(async () => { await deleteTestWorkspaces(db, [ws], userIds); }, 180_000);

describe('module has no settings yet', () => {
  it('every quiz uses the built-in defaults — legacy per-quiz rows are ignored', async () => {
    for (const k of ['A', 'B', 'C'] as const) {
      expect(rulesOf(await effective(k))).toEqual({ pass: 70, time: 0, attempts: -1, shuffle: false, required: true });
      expect((await effective(k)).source).toBe('builtin');
    }
  });
});

describe('module settings are the single source of truth', () => {
  it('saving module settings changes EVERY quiz identically, whatever their legacy row says', async () => {
    const { saveModuleQuizDefaults, getModuleQuizSettingsOverview } = await import('@/app/actions/moduleQuizzes');
    expect((await saveModuleQuizDefaults(mod, { passPercentage: 60, timeLimitMinutes: 10, maxAttempts: 3, randomizeQuestions: true, isRequired: false })).error).toBeUndefined();
    for (const k of ['A', 'B', 'C'] as const) {
      expect(rulesOf(await effective(k))).toEqual({ pass: 60, time: 10, attempts: 3, shuffle: true, required: false });
      expect((await effective(k)).source).toBe('module');
    }
    const o = (await getModuleQuizSettingsOverview(mod)).data!;
    expect(o.defaults).toMatchObject({ passPercentage: 60, maxAttempts: 3, isRequired: false });
    expect(o.quizzes.map((q) => q.title)).toEqual(['Quiz A', 'Quiz B', 'Quiz C']);
    expect(Object.keys(o.quizzes[0]).sort()).toEqual(['id', 'status', 'title']); // no per-quiz settings state exposed
  });

  it('rejects invalid module settings', async () => {
    const { saveModuleQuizDefaults } = await import('@/app/actions/moduleQuizzes');
    expect((await saveModuleQuizDefaults(mod, { passPercentage: 101, timeLimitMinutes: 0, maxAttempts: -1, randomizeQuestions: false, isRequired: true })).error).toBeTruthy();
    expect((await saveModuleQuizDefaults(mod, { passPercentage: 70, timeLimitMinutes: 0, maxAttempts: 0, randomizeQuestions: false, isRequired: true })).error).toBeTruthy();
  });

  it('the legacy rows are preserved in the database, untouched', async () => {
    const { data: a } = await db.from('module_quiz_settings').select('pass_percentage, max_attempts, time_limit_minutes').eq('quiz_id', Q.A).single();
    const { data: b } = await db.from('module_quiz_settings').select('pass_percentage, max_attempts').eq('quiz_id', Q.B).single();
    expect(a).toEqual({ pass_percentage: 90, max_attempts: 2, time_limit_minutes: 5 });
    expect(b).toEqual({ pass_percentage: 50, max_attempts: 1 });
  });
});

describe('student side grades every quiz against the module', () => {
  it('pass mark: the same 50% attempt FAILS on every quiz at 60%, PASSES on every quiz at 50%', async () => {
    for (const k of ['A', 'B', 'C'] as const) expect(await submit(k, 1)).toMatchObject({ success: true, score: 50, passed: false });
    const { saveModuleQuizDefaults } = await import('@/app/actions/moduleQuizzes');
    await saveModuleQuizDefaults(mod, { passPercentage: 50, timeLimitMinutes: 10, maxAttempts: 3, randomizeQuestions: true, isRequired: false });
    for (const k of ['A', 'B', 'C'] as const) expect(await submit(k, 1)).toMatchObject({ success: true, score: 50, passed: true });
  });

  it('attempt cap: the module cap of 3 applies to all (A\'s old cap 2 and B\'s old cap 1 are gone)', async () => {
    for (const k of ['A', 'B', 'C'] as const) {
      expect(await submit(k, 1)).toMatchObject({ success: true }); // 3rd attempt
      expect(await submit(k, 2)).toMatchObject({ code: 'ATTEMPTS_EXHAUSTED' }); // 4th
      const { count } = await db.from('module_quiz_attempts').select('id', { count: 'exact', head: true }).eq('quiz_id', Q[k]).eq('student_id', contact);
      expect(count).toBe(3);
    }
  });

  it('required for completion is module-wide: off -> no quiz gates completion, on -> all of them do', async () => {
    expect((await completion()).totals.moduleQuizzes).toBe(0);
    const { saveModuleQuizDefaults } = await import('@/app/actions/moduleQuizzes');
    await saveModuleQuizDefaults(mod, { passPercentage: 50, timeLimitMinutes: 10, maxAttempts: 3, randomizeQuestions: true, isRequired: true });
    expect((await completion()).totals.moduleQuizzes).toBe(3);
  });
});
