import { describe, it, expect, vi, beforeEach } from 'vitest';

// Batch 6 / Part 1: a course's completion_mode governs whether allowIncomplete (the student's
// confirmed "mark complete anyway" click) is honoured. 'loose' (default) = today's exact
// behaviour, unchanged. 'strict' = the override is rejected regardless of what the caller asks
// for, with a distinct, explicit error message.

const state: {
  progress: any; enrollment: any; lesson: any; course: any; blocks: any[]; completions: any[];
  inserted: any[]; updated: any[];
} = { progress: null, enrollment: null, lesson: null, course: null, blocks: [], completions: [], inserted: [], updated: [] };

function builder(table: string) {
  const ctx: any = { table, filters: {} };
  const b: any = {
    select: () => b,
    eq: (col: string, val: any) => { ctx.filters[col] = val; return b; },
    in: (col: string, vals: any[]) => { ctx.inCol = col; ctx.inVals = vals; return b; },
    not: () => b,
    limit: () => b,
    maybeSingle: async () => resolveOne(ctx),
    single: async () => resolveOne(ctx),
    insert: (row: any) => { state.inserted.push({ table, row }); return { error: null }; },
    update: (row: any) => { state.updated.push({ table, row, filters: { ...ctx.filters } }); return b; },
    then: (res: any) => Promise.resolve(res(resolveMany(ctx))),
  };
  return b;
}

function resolveOne(ctx: any) {
  switch (ctx.table) {
    case 'course_progress': return { data: state.progress, error: null };
    case 'enrollments': return { data: state.enrollment, error: null };
    case 'course_lessons': return { data: state.lesson, error: null };
    case 'courses': return { data: state.course, error: null };
    case 'course_modules': return { data: null, error: null };
    case 'pages': return { data: null, error: null }; // old flat model — no canvas
    default: return { data: null, error: null };
  }
}
function resolveMany(ctx: any) {
  if (ctx.table === 'content_blocks') return { data: state.blocks, error: null };
  if (ctx.table === 'lesson_block_completions') return { data: state.completions, error: null };
  if (ctx.table === 'quiz_questions') return { data: [], error: null };
  return { data: [], error: null };
}

vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ from: (t: string) => builder(t) }) }));
vi.mock('@/shared/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/lib/events/EventBus', () => ({ publishEvent: vi.fn(async () => {}) }));
vi.mock('../../../libs/core/src/events/lms-event-bus', () => ({ emitLMSEvent: vi.fn(async () => {}) }));
vi.mock('./courseCompletionEvent', () => ({ maybeFireCourseCompleted: vi.fn(async () => {}) }));
vi.mock('../../../libs/core/src/analytics/struggle-processor', () => ({ evaluateStudentStruggle: vi.fn(async () => {}) }));

import { markLessonCompleteForContact } from './completeLesson';

beforeEach(() => {
  state.progress = null;
  state.enrollment = { id: 'e1', status: 'active', active: true, enrolled_at: new Date().toISOString() };
  state.lesson = { id: 'L1', module_id: null };
  state.course = { completion_mode: 'loose' };
  state.blocks = [{ id: 'CB1' }]; // one real block, one lesson_id — the "old flat model" path
  state.completions = []; // not completed
  state.inserted = [];
  state.updated = [];
});

describe('markLessonCompleteForContact — strict completion mode', () => {
  it('loose (default) + allowIncomplete: unchanged behaviour — override accepted', async () => {
    const res = await markLessonCompleteForContact('ws1', 'c1', 'course1', 'L1', { allowIncomplete: true });
    expect(res).toEqual({ success: true, progressPercentage: 0, override: true });
    expect(state.inserted[0].row.completion_override).toBe(true);
  });

  it('loose + NO allowIncomplete: still rejects an unmet block gate exactly as before', async () => {
    const res: any = await markLessonCompleteForContact('ws1', 'c1', 'course1', 'L1', {});
    expect(res.error).toMatch(/Complete every block in this lesson first/);
    expect(state.inserted).toHaveLength(0);
  });

  it('strict + allowIncomplete: the override is rejected with a strict-specific message, not silently ignored', async () => {
    state.course = { completion_mode: 'strict' };
    const res: any = await markLessonCompleteForContact('ws1', 'c1', 'course1', 'L1', { allowIncomplete: true });
    expect(res.error).toMatch(/genuinely completed/i);
    expect(res.error).toMatch(/instructor has turned off/i);
    expect(state.inserted).toHaveLength(0); // no row written — nothing silently marked complete
  });

  it('strict + the block is GENUINELY complete: succeeds normally, no override involved', async () => {
    state.course = { completion_mode: 'strict' };
    state.completions = [{ content_block_id: 'CB1' }]; // the one block IS done
    const res = await markLessonCompleteForContact('ws1', 'c1', 'course1', 'L1', { allowIncomplete: true });
    expect(res).toEqual({ success: true, progressPercentage: 0, override: false });
    expect(state.inserted[0].row.completion_override).toBe(false);
  });

  it('strict with no override requested at all: same rejection message as loose in that case (nothing strict-specific to say)', async () => {
    state.course = { completion_mode: 'strict' };
    const res: any = await markLessonCompleteForContact('ws1', 'c1', 'course1', 'L1', {});
    expect(res.error).toMatch(/Complete every block in this lesson first/);
  });
});
