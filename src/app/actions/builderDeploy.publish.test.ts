import { describe, expect, it, vi, beforeEach } from 'vitest';

// publishPageStatic must never report success on a partial publish: every write is checked for an
// error AND an affected row, and a failed website flag restores the page's previous state.

type Result = { data: any; error: any };
let pagesUpdates: Result[] = [];
let websitesUpdate: Result = { data: [{ id: 'w1' }], error: null };
const pagesWrites: any[] = [];

const PAGE = {
  id: 'p1', name: 'Home', content: '{}', rendered_html: 'OLD', status: 'draft', is_published: false, published_at: null,
  website_page: { website: { id: 'w1', subdomain: 's', config: {} } },
};

function chain(table: string, op: { kind: string; payload?: any }): any {
  const c: any = {};
  for (const m of ['select', 'eq']) c[m] = () => c;
  c.update = (payload: any) => { op.kind = 'update'; op.payload = payload; if (table === 'pages') pagesWrites.push(payload); return c; };
  const result = () => {
    if (op.kind !== 'update') return { data: PAGE, error: null };
    return table === 'pages' ? (pagesUpdates.shift() ?? { data: [{ id: 'p1' }], error: null }) : websitesUpdate;
  };
  c.single = async () => result();
  c.then = (res: any, rej: any) => Promise.resolve(result()).then(res, rej);
  return c;
}

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({
    from: (t: string) => chain(t, { kind: 'select' }),
    storage: { from: () => ({ upload: async () => ({}) }) },
  }),
  createAdminClient: () => ({}),
}));
vi.mock('@/lib/auth', () => ({
  requireWorkspaceAccess: async () => ({ workspaceId: 'ws1' }),
  requireModuleAccess: async () => {},
}));
vi.mock('@/lib/builder/renderer', () => ({ renderCraftToHtml: () => '<html>NEW</html>' }));
vi.mock('@/lib/domains/verify', () => ({ releaseHostFromVercel: async () => ({ ok: true }), verifyWebsiteDomainById: async () => ({ ready: true }) }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

import { publishPageStatic } from './builderDeploy';

describe('publishPageStatic', () => {
  beforeEach(() => {
    pagesUpdates = [];
    websitesUpdate = { data: [{ id: 'w1' }], error: null };
    pagesWrites.length = 0;
  });

  it('succeeds when both writes land', async () => {
    const res = await publishPageStatic('p1');
    expect(res.success).toBe(true);
  });

  it('fails when the pages update affects zero rows', async () => {
    pagesUpdates = [{ data: [], error: null }];
    const res = await publishPageStatic('p1');
    expect(res.success).toBe(false);
    expect(pagesWrites).toHaveLength(1);
  });

  it('fails on a pages update error', async () => {
    pagesUpdates = [{ data: null, error: { message: 'boom' } }];
    expect((await publishPageStatic('p1')).success).toBe(false);
  });

  it('fails and rolls the page back when the websites update errors', async () => {
    websitesUpdate = { data: null, error: { message: 'boom' } };
    const res = await publishPageStatic('p1');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Nothing was published/);
    expect(pagesWrites).toHaveLength(2);
    expect(pagesWrites[1]).toMatchObject({ is_published: false, status: 'draft', rendered_html: 'OLD' });
  });

  it('fails and rolls back when the websites update affects zero rows', async () => {
    websitesUpdate = { data: [], error: null };
    const res = await publishPageStatic('p1');
    expect(res.success).toBe(false);
    expect(pagesWrites[1]).toMatchObject({ is_published: false });
  });
});
