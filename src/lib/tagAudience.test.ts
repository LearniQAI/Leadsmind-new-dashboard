import { describe, it, expect } from 'vitest';
import { resolveContactIdsWithAllTags, resolveTagIds } from '@/lib/tagAudience';

const T1 = '11111111-1111-4111-8111-111111111111';
const T2 = '22222222-2222-4222-8222-222222222222';

// Chainable fake recording which tables are read; honours eq/in filters and range() paging.
function fakeDb(tables: { tags?: any[]; tag_assignments?: any[] }) {
  const reads: string[] = [];
  return {
    reads,
    from(table: string) {
      reads.push(table);
      let rows: any[] = [...((tables as any)[table] ?? [])];
      let from = 0; let to = Infinity;
      const q: any = {
        select: () => q, order: () => q,
        eq: (c: string, v: any) => { rows = rows.filter((r) => r[c] === v); return q; },
        in: (c: string, vs: any[]) => { rows = rows.filter((r) => vs.includes(r[c])); return q; },
        range: (a: number, b: number) => { from = a; to = b; return q; },
        then: (res: any) => res({ data: rows.slice(from, to + 1), error: null }),
      };
      return q;
    },
  } as any;
}

const tags = [{ id: T1, workspace_id: 'w', name: 'VIP' }, { id: T2, workspace_id: 'w', name: 'Gold Member' }, { id: 'x', workspace_id: 'other', name: 'VIP' }];
const asg = (contact: string, tag: string) => ({ id: `${contact}-${tag}`, workspace_id: 'w', entity_type: 'contact', entity_id: contact, tag_id: tag });

describe('resolveContactIdsWithAllTags (tag_assignments, not the legacy contacts.tags array)', () => {
  const db = () => fakeDb({ tags, tag_assignments: [asg('a', T1), asg('c', T1), asg('c', T2), asg('d', T2), { ...asg('e', T1), entity_type: 'company' }, { ...asg('f', T1), workspace_id: 'other' }] });

  it('a contact with the tag ONLY in the relational table is found; nothing reads the contacts table', async () => {
    const d = db();
    expect([...(await resolveContactIdsWithAllTags(d, 'w', ['VIP']))].sort()).toEqual(['a', 'c']);
    expect(d.reads).not.toContain('contacts');
    expect(d.reads).toContain('tag_assignments');
  });

  it('requires ALL listed tags (AND), and matches names case-insensitively and ids directly', async () => {
    expect([...(await resolveContactIdsWithAllTags(db(), 'w', ['vip', ' gold member ']))]).toEqual(['c']);
    expect([...(await resolveContactIdsWithAllTags(db(), 'w', [T1, T2]))]).toEqual(['c']);
    expect([...(await resolveContactIdsWithAllTags(db(), 'w', [T1, 'Gold Member']))]).toEqual(['c']);
  });

  it('is scoped to the workspace and to contacts (another workspace\'s tag / a company\'s tag never match)', async () => {
    const ids = await resolveContactIdsWithAllTags(db(), 'w', ['VIP']);
    expect(ids.has('e')).toBe(false); // entity_type company
    expect(ids.has('f')).toBe(false); // other workspace's assignment
  });

  it('an unknown tag yields NOBODY (the AND is empty), never a widened audience', async () => {
    expect((await resolveContactIdsWithAllTags(db(), 'w', ['VIP', 'does-not-exist'])).size).toBe(0);
    expect(await resolveTagIds(db(), 'w', ['VIP', 'nope'])).toBeNull();
    expect((await resolveContactIdsWithAllTags(db(), 'w', [])).size).toBe(0);
  });

  it('pages through more than 1000 assignments (PostgREST silently caps a plain select at 1000)', async () => {
    const many = Array.from({ length: 2500 }, (_, i) => asg(`c${i}`, T1));
    const ids = await resolveContactIdsWithAllTags(fakeDb({ tags, tag_assignments: many }), 'w', ['VIP']);
    expect(ids.size).toBe(2500);
  });
});
