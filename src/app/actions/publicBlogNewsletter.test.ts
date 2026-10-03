import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeFakeDb, rowsWritten, type FakeDb } from '@/test/fakeSupabase';

const h = vi.hoisted(() => ({ db: null as any, hostWorkspace: 'wsHost' as string | null, serverClientUsed: false }));

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/shared/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/auth', () => ({ getCurrentWorkspaceId: async () => null }));
vi.mock('@/lib/domains/platformHosts', () => ({ isPlatformDefaultHost: () => false }));
vi.mock('@/lib/blog/publicWorkspace', () => ({ resolvePublicBlogWorkspaceId: async () => h.hostWorkspace }));
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => h.db,
  // The anonymous-session client must NOT be used for the contact write any more.
  createServerClient: async () => { h.serverClientUsed = true; throw new Error('anon-session client must not be used'); },
}));

import { subscribeToNewsletter } from '@/app/actions/publicBlog';

let db: FakeDb;
beforeEach(() => {
  h.hostWorkspace = 'wsHost'; h.serverClientUsed = false;
  db = makeFakeDb({ pages: [{ id: 'p1', workspace_id: 'wsHost' }], contacts: [] });
  h.db = db;
});

describe('subscribeToNewsletter (public write on the service-role client)', () => {
  it('creates the contact in the HOST-derived workspace and never touches the anonymous-session client', async () => {
    const r: any = await subscribeToNewsletter('  Reader@Example.COM ');
    expect(r.success).toBe(true);
    expect(db.tables.contacts).toHaveLength(1);
    expect(db.tables.contacts[0]).toMatchObject({ workspace_id: 'wsHost', email: 'reader@example.com', source: 'blog_newsletter' });
    expect(h.serverClientUsed).toBe(false);
  });

  it('a workspaceId argument is only checked against the host; a different one is refused and nothing is written', async () => {
    const r: any = await subscribeToNewsletter('a@example.com', 'someOtherWorkspace');
    expect(r.error).toMatch(/could not be resolved/);
    expect(rowsWritten(db)).toBe(0);
    const ok: any = await subscribeToNewsletter('b@example.com', 'wsHost');
    expect(ok.success).toBe(true);
  });

  it('no workspace for the host: refused, nothing written', async () => {
    h.hostWorkspace = null;
    expect((await subscribeToNewsletter('a@example.com') as any).error).toMatch(/could not be resolved/);
    expect(rowsWritten(db)).toBe(0);
  });

  it('keeps the old policy\'s existence check: a workspace that owns no page cannot receive subscribers', async () => {
    db.tables.pages = [];
    const r: any = await subscribeToNewsletter('a@example.com');
    expect(r.error).toBe('Failed to capture subscriber');
    expect(db.tables.contacts).toHaveLength(0);
  });

  it('a duplicate email is still a friendly success', async () => {
    const dupDb = { from: (t: string) => (t === 'pages' ? db.from(t) : { insert: async () => ({ error: { code: '23505', message: 'duplicate key' } }) }) };
    h.db = dupDb;
    const r: any = await subscribeToNewsletter('a@example.com');
    expect(r).toEqual({ success: true, message: 'Welcome back! You are already subscribed.' });
  });

  it('a database error is a generic failure', async () => {
    db.failTables.add('contacts');
    const r: any = await subscribeToNewsletter('a@example.com');
    expect(r.error).toBe('Failed to capture subscriber');
  });
});
