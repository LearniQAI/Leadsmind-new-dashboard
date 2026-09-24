import { describe, expect, it, vi, beforeEach } from 'vitest';

// inviteTeamMember (standard invite path): re-inviting an address whose earlier invitation
// expired used to hit UNIQUE (workspace_id, email) and fail with "Failed to create
// invitation."; the email must be the platform-branded template with a plain-text part.

type Op = { table: string; op: string; payload?: unknown; filters: [string, unknown[]][] };
const ops: Op[] = [];
let existingUserId: string | null = null;
let existingMember = false;
const sendEmail = vi.fn();

vi.mock('@/lib/auth', () => ({
  getCurrentWorkspaceId: async () => 'ws-1',
  getCurrentWorkspace: vi.fn(),
  requireWorkspaceAccess: vi.fn(),
}));
vi.mock('@/lib/api/workspaceAuth', () => ({ requireWorkspaceRole: vi.fn() }));
vi.mock('@/lib/api/apiKeys', () => ({ mintWorkspaceApiKey: vi.fn() }));
vi.mock('@/lib/encryption', () => ({ encrypt: (v: string) => v }));
vi.mock('@/lib/email', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

function builder(table: string, resolveFor: (o: Op) => unknown) {
  const o: Op = { table, op: 'select', filters: [] };
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'ilike', 'limit', 'gt']) {
    b[m] = (...args: unknown[]) => {
      if (m === 'select' && o.op !== 'select') return b; // insert(...).select()
      o.filters.push([m, args]);
      return b;
    };
  }
  b.delete = () => { o.op = 'delete'; return b; };
  b.insert = (payload: unknown) => { o.op = 'insert'; o.payload = payload; return b; };
  const done = () => { ops.push(o); return Promise.resolve(resolveFor(o)); };
  b.single = done;
  b.maybeSingle = done;
  (b as { then: unknown }).then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => done().then(res, rej);
  return b;
}

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'admin-1' } } }) },
    from: (table: string) =>
      builder(table, () =>
        table === 'workspace_members' ? { data: { role: 'admin' } } : { data: { name: "Olu Max's Workspace" } }
      ),
  }),
  createAdminClient: () => ({
    from: (table: string) =>
      builder(table, (o) => {
        if (table === 'users' && o.filters.some(([m]) => m === 'ilike')) return { data: existingUserId ? { id: existingUserId } : null };
        if (table === 'users') return { data: { first_name: 'Olu', last_name: 'Max' } };
        if (table === 'workspace_members') return { data: existingMember ? { id: 'm1' } : null };
        if (table === 'workspace_invitations' && o.op === 'insert') return { data: { id: 'tok-1', ...(o.payload as object) }, error: null };
        return { data: null, error: null };
      }),
  }),
}));

import { inviteTeamMember } from './settings';

beforeEach(() => {
  ops.length = 0;
  existingUserId = null;
  existingMember = false;
  sendEmail.mockReset();
});

describe('inviteTeamMember (standard invite)', () => {
  it('replaces any earlier invitation for the address before inserting, with a normalised email', async () => {
    const res = await inviteTeamMember('  Porti_A@Gmail.com ', 'member', ['dashboard']);
    expect(res).toMatchObject({ acceptUrl: expect.stringContaining('/auth/accept-invite?token=tok-1') });

    const inv = ops.filter((o) => o.table === 'workspace_invitations');
    expect(inv.map((o) => o.op)).toEqual(['delete', 'insert']);
    expect(inv[0].filters).toContainEqual(['eq', ['workspace_id', 'ws-1']]);
    expect(inv[0].filters).toContainEqual(['ilike', ['email', 'porti\\_a@gmail.com']]);
    expect(inv[1].payload).toMatchObject({ workspace_id: 'ws-1', email: 'porti_a@gmail.com', role: 'member' });
  });

  it('sends the LeadsMind-branded template with a plain-text part and the inviter name', async () => {
    await inviteTeamMember('new@example.com', 'viewer', ['dashboard']);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const mail = sendEmail.mock.calls[0][0];
    expect(mail.to).toBe('new@example.com');
    expect(mail.subject).toBe("Olu Max invited you to join Olu Max's Workspace on LeadsMind");
    expect(mail.text).toContain('/auth/accept-invite?token=tok-1');
    expect(mail.html).toContain('LeadsMind_Logo.png.png');
    expect(mail.config).toBeUndefined(); // platform sender, never a workspace's white-label config
  });

  it('refuses to invite someone who is already a member, without touching invitations', async () => {
    existingUserId = 'user-9';
    existingMember = true;
    const res = await inviteTeamMember('member@example.com', 'member', ['dashboard']);
    expect(res).toEqual({ error: 'This person is already a member of this workspace.' });
    expect(ops.some((o) => o.table === 'workspace_invitations')).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
