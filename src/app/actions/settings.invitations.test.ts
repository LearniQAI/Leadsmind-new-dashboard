import { describe, expect, it, vi, beforeEach } from 'vitest';

// Regression cover for the "stale accepted invitation duplicates the person on
// the Team page" bug: getWorkspaceInvitations() must only ever return genuinely
// pending, non-expired rows.

const calls: { method: string; args: unknown[] }[] = [];
let returnedRows: unknown[] = [];

const getWsId = vi.fn();
const getCurrentWorkspace = vi.fn();

vi.mock('@/lib/auth', () => ({
  getCurrentWorkspaceId: (...a: unknown[]) => getWsId(...a),
  getCurrentWorkspace: (...a: unknown[]) => getCurrentWorkspace(...a),
  requireWorkspaceAccess: vi.fn(),
}));

vi.mock('@/lib/api/workspaceAuth', () => ({ requireWorkspaceRole: vi.fn() }));
vi.mock('@/lib/api/apiKeys', () => ({ mintWorkspaceApiKey: vi.fn() }));
vi.mock('@/lib/encryption', () => ({ encrypt: (v: string) => `enc(${v})` }));
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

function makeBuilder() {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'gt']) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }
  // getWorkspaceInvitations awaits the builder directly (no .single()) — make it thenable.
  (builder as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    resolve({ data: returnedRows, error: null });
  return builder;
}

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ from: () => makeBuilder() }),
  createAdminClient: () => ({ from: () => makeBuilder() }),
}));

import { getWorkspaceInvitations } from './settings';

describe('getWorkspaceInvitations — only pending, non-expired rows', () => {
  beforeEach(() => {
    calls.length = 0;
    returnedRows = [];
    getWsId.mockResolvedValue('ws-1');
    getCurrentWorkspace.mockReset();
  });

  it('constrains the query to workspace, status=pending, and expires_at in the future', async () => {
    await getWorkspaceInvitations();

    const eqArgs = calls.filter((c) => c.method === 'eq').map((c) => c.args);
    expect(eqArgs).toContainEqual(['workspace_id', 'ws-1']);
    expect(eqArgs).toContainEqual(['status', 'pending']);

    const gt = calls.find((c) => c.method === 'gt');
    expect(gt).toBeTruthy();
    expect(gt!.args[0]).toBe('expires_at');
    // a valid ISO timestamp roughly equal to now
    expect(Number.isNaN(Date.parse(gt!.args[1] as string))).toBe(false);
    expect(Math.abs(Date.parse(gt!.args[1] as string) - Date.now())).toBeLessThan(60_000);
  });

  it('passes through whatever the constrained query returns', async () => {
    returnedRows = [{ id: 'i1', email: 'still-pending@example.com', status: 'pending' }];
    const res = await getWorkspaceInvitations();
    expect(res).toEqual({ data: returnedRows });
  });
});
