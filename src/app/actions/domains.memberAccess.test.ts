import { describe, expect, it, vi, beforeEach } from 'vitest';

// Regression cover: custom-domain add / view / delete must work for a plain 'member' (no role
// gate), and a thrown/failed add must surface an error rather than hang.

let role: string | null = 'member';
const inserted: any[] = [];

function chain(result: any): any {
  const c: any = {};
  for (const m of ['select', 'eq', 'not', 'limit', 'order', 'insert', 'delete', 'update']) {
    c[m] = (...a: any[]) => { if (m === 'insert') inserted.push(a[0]); return c; };
  }
  c.maybeSingle = async () => result;
  c.single = async () => result;
  c.then = (res: any) => Promise.resolve(result).then(res);
  return c;
}

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
    from: (t: string) => t === 'workspace_members'
      ? chain({ data: role ? { role } : null, error: null })
      : chain({ data: [{ id: 'd1', hostname: 'zainullhassan.site' }], error: null }),
  }),
  createAdminClient: () => ({
    from: (t: string) => chain(t === 'domain_configurations'
      ? { data: [], error: null, count: 0 }
      : { data: null, error: null, count: 0 }),
  }),
}));
vi.mock('@/lib/auth', () => ({ getUser: async () => ({ id: 'u1' }), getCurrentWorkspaceId: async () => 'w1' }));
vi.mock('@/lib/api/workspaceAuth', async () => {
  const actual: any = await vi.importActual('@/lib/api/workspaceAuth');
  return { ...actual, requireWorkspaceRole: async (allowed?: string[]) => {
    if (!role || (allowed && !allowed.includes(role))) throw new Error('Insufficient privileges');
    return { userId: 'u1', userEmail: null, workspaceId: 'w1', role };
  } };
});
vi.mock('@/lib/domains/verify', () => ({ releaseHostFromVercel: async () => ({ ok: true }) }));
vi.mock('@/lib/config/flags', () => ({ ENFORCE_PLAN_LIMITS: false }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

import { addDomain, getDomains, deleteDomain } from './domains';

describe('custom domain actions are open to every workspace member', () => {
  beforeEach(() => { role = 'member'; inserted.length = 0; });

  it('member can add a .site domain', async () => {
    const res: any = await addDomain('w1', 'zainullhassan.site');
    expect(res.success).toBe(true);
    expect(inserted[0]).toMatchObject({ workspace_id: 'w1', hostname: 'zainullhassan.site', status: 'pending' });
  });

  it('member can view domains', async () => {
    const res: any = await getDomains('w1');
    expect(res.success).toBe(true);
  });

  it('member can delete a domain', async () => {
    const res: any = await deleteDomain('d1');
    expect(res.success).toBe(true);
  });

  it('a non-member is still rejected', async () => {
    role = null;
    expect(((await addDomain('w1', 'zainullhassan.site')) as any).success).toBe(false);
    expect(((await getDomains('w1')) as any).success).toBe(false);
    expect(((await deleteDomain('d1')) as any).success).toBe(false);
  });
});
