import { describe, it, expect, vi, beforeEach } from 'vitest';

// Verifies the Batch 2 / fix 5 gates in enrollStudent(): draft + cap checks apply to NEW
// enrolments only; an already-enrolled student is never invalidated.

type Row = Record<string, any> | null;
const state: { course: Row; existing: Row; count: number; member: Row; inserted: any[] } = {
  course: null, existing: null, count: 0, member: null, inserted: [],
};

function builder(table: string) {
  const ctx: any = { table, head: false, op: 'select' };
  const b: any = {
    select: (_cols?: string, opts?: any) => { if (opts?.head) ctx.head = true; return b; },
    insert: (row: any) => { ctx.op = 'insert'; state.inserted.push({ table, row }); return b; },
    eq: () => b, in: () => b, contains: () => b, limit: () => b, order: () => b,
    single: async () => resolve(ctx, true),
    maybeSingle: async () => resolve(ctx, false),
    then: (res: any) => Promise.resolve(resolve(ctx, false)).then(res),
  };
  return b;
}
function resolve(ctx: any, _single: boolean) {
  if (ctx.op === 'insert') return { data: { id: 'new-id' }, error: null };
  switch (ctx.table) {
    case 'courses': return { data: state.course, error: state.course ? null : { message: 'nf' } };
    case 'workspace_members': return { data: state.member, error: null };
    case 'contacts': return { data: { id: 'contact-1' }, error: null };
    case 'enrollments': return ctx.head ? { count: state.count, data: null, error: null } : { data: state.existing, error: null };
    default: return { data: null, error: null };
  }
}

vi.mock('@/lib/auth', () => ({
  getUser: async () => ({ id: 'user-1', email: 's@example.com', user_metadata: {} }),
  getCurrentWorkspaceId: async () => 'ws-1',
}));
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ from: (t: string) => builder(t) }),
  createServerClient: async () => ({ from: (t: string) => builder(t) }),
}));
vi.mock('../../../libs/core/src/events/lms-event-bus', () => ({ emitLMSEvent: vi.fn(async () => {}) }));
vi.mock('@/lib/webhooks/dispatcher', () => ({ dispatchWebhook: vi.fn(async () => {}) }));
vi.mock('@/shared/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));
vi.mock('stripe', () => ({ default: class {} }));

import { enrollStudent } from './studentEnrollments';

const base = { workspace_id: 'ws-1', price: 0, pricing_model: 'free', start_method: 'instant_payment', email_access_auto_send: false, cohorts_enabled: false, published: true, status: 'published', enrolment_cap: null };

beforeEach(() => {
  state.course = { ...base }; state.existing = null; state.count = 0; state.member = null; state.inserted = [];
});

describe('enrollStudent gates (Batch 2 / fix 5)', () => {
  it('rejects a draft, unpublished course', async () => {
    state.course = { ...base, published: false, status: 'draft' };
    const res: any = await enrollStudent('c1');
    expect(res.error).toMatch(/not currently available/i);
    expect(state.inserted.filter((i) => i.table === 'enrollments')).toHaveLength(0);
  });

  it('rejects when the enrolment cap is reached', async () => {
    state.course = { ...base, enrolment_cap: 5 }; state.count = 5;
    const res: any = await enrollStudent('c1');
    expect(res.error).toMatch(/capacity reached/i);
    expect(state.inserted.filter((i) => i.table === 'enrollments')).toHaveLength(0);
  });

  it('enrols normally in a published, under-cap course', async () => {
    state.course = { ...base, enrolment_cap: 5 }; state.count = 4;
    const res: any = await enrollStudent('c1');
    expect(res.error).toBeUndefined();
    expect(res.success).toBe(true);
    expect(state.inserted.filter((i) => i.table === 'enrollments')).toHaveLength(1);
  });

  it('enrols in a published course with no cap', async () => {
    const res: any = await enrollStudent('c1');
    expect(res.success).toBe(true);
  });

  it('never invalidates an already-enrolled student, even in a draft / over-cap course', async () => {
    state.course = { ...base, published: false, status: 'draft', enrolment_cap: 1 }; state.count = 3;
    state.existing = { id: 'e1' };
    const res: any = await enrollStudent('c1');
    expect(res).toEqual({ success: true, message: 'Already enrolled' });
    expect(state.inserted.filter((i) => i.table === 'enrollments')).toHaveLength(0);
  });
});
