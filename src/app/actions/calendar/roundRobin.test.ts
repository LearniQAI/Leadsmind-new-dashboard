import { describe, expect, it, vi, beforeEach } from 'vitest';

const requireWorkspaceAccess = vi.fn();
vi.mock('@/lib/auth', () => ({ requireWorkspaceAccess: () => requireWorkspaceAccess() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/shared/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/shared/errors/AppError', () => ({ toClientError: (e: any) => ({ error: e?.message ?? 'error' }) }));

// --- in-memory stand-in for the two tables setRoundRobinPool touches ---
let calendarRow: any;
let workspaceMembers: Array<{ user_id: string; role: string }>;
let rrRows: Array<{ calendar_id: string; workspace_id: string; user_id: string }>;
const inserted: any[] = [];
const deleted: string[][] = [];

function tableApi(table: string) {
  const filters: Record<string, any> = {};
  const api: any = {
    select: () => api,
    eq: (k: string, v: any) => { filters[k] = v; return api; },
    neq: (k: string, v: any) => { filters[`neq_${k}`] = v; return api; },
    in: (k: string, v: any[]) => { filters[`in_${k}`] = v; return api; },
    single: async () => {
      if (table === 'booking_calendars') return calendarRow ? { data: calendarRow } : { data: null, error: 'x' };
      return { data: null };
    },
    then: undefined as any,
    delete: () => ({
      eq: () => ({
        eq: () => ({
          in: async (_k: string, ids: string[]) => { deleted.push(ids); rrRows = rrRows.filter((r) => !ids.includes(r.user_id)); return { error: null }; },
        }),
      }),
    }),
    insert: async (rows: any[]) => { inserted.push(...rows); return { error: null }; },
  };
  // resolve list-style awaits
  api.then = (resolve: any) => {
    let data: any[] = [];
    if (table === 'workspace_members') {
      data = workspaceMembers
        .filter((m) => (filters.in_user_id ? filters.in_user_id.includes(m.user_id) : true))
        .filter((m) => (filters.neq_role ? m.role !== filters.neq_role : true))
        .map((m) => ({ user_id: m.user_id, role: m.role }));
    } else if (table === 'round_robin_assignment') {
      data = rrRows.filter((r) => r.calendar_id === filters.calendar_id).map((r) => ({ user_id: r.user_id }));
    }
    return Promise.resolve({ data }).then(resolve);
  };
  return api;
}

const client = { from: (t: string) => tableApi(t) };
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => client,
  createAdminClient: () => client,
}));

import { setRoundRobinPool } from './roundRobin';

beforeEach(() => {
  requireWorkspaceAccess.mockReset().mockResolvedValue({ workspaceId: 'ws-1', userId: 'admin' });
  calendarRow = { id: 'cal-1', name: 'Sales', calendar_type: 'round_robin' };
  workspaceMembers = [
    { user_id: 'h1', role: 'admin' },
    { user_id: 'h2', role: 'member' },
    { user_id: 'h3', role: 'member' },
    { user_id: 'client-1', role: 'client' },
  ];
  rrRows = [];
  inserted.length = 0;
  deleted.length = 0;
});

describe('setRoundRobinPool', () => {
  it('enrols new hosts (writes round_robin_assignment rows with count 0)', async () => {
    const res = await setRoundRobinPool('cal-1', ['h1', 'h2']);
    expect(res.success).toBe(true);
    expect(inserted.map((r) => r.user_id).sort()).toEqual(['h1', 'h2']);
    expect(inserted.every((r) => r.booking_count === 0 && r.calendar_id === 'cal-1' && r.workspace_id === 'ws-1')).toBe(true);
  });

  it('only diffs — keeps hosts who stay, adds new, removes absent (never resets a stayer)', async () => {
    rrRows = [
      { calendar_id: 'cal-1', workspace_id: 'ws-1', user_id: 'h1' },
      { calendar_id: 'cal-1', workspace_id: 'ws-1', user_id: 'h2' },
    ];
    const res = await setRoundRobinPool('cal-1', ['h1', 'h3']); // keep h1, drop h2, add h3
    expect(res.success).toBe(true);
    expect(inserted.map((r) => r.user_id)).toEqual(['h3']);
    expect(deleted).toEqual([['h2']]);
  });

  it('clearing the pool (empty list) removes every enrolled host', async () => {
    rrRows = [{ calendar_id: 'cal-1', workspace_id: 'ws-1', user_id: 'h1' }];
    const res = await setRoundRobinPool('cal-1', []);
    expect(res.success).toBe(true);
    expect(deleted).toEqual([['h1']]);
    expect(inserted).toHaveLength(0);
  });

  it('rejects a user id that is not a workspace member (never trusts the client)', async () => {
    const res = await setRoundRobinPool('cal-1', ['h1', 'stranger']);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/not members/i);
    expect(inserted).toHaveLength(0);
  });

  it('rejects a client-role user as a host', async () => {
    const res = await setRoundRobinPool('cal-1', ['client-1']);
    expect(res.success).toBe(false);
    expect(inserted).toHaveLength(0);
  });

  it('fails cleanly if the calendar is not in the caller\'s workspace', async () => {
    calendarRow = null;
    const res = await setRoundRobinPool('cal-x', ['h1']);
    expect(res.success).toBe(false);
  });
});
