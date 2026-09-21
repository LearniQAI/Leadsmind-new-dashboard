import { describe, it, expect, vi } from 'vitest';

// In-memory database for the JS fallback path (the RPC is forced to fail so the fallback runs).
const db: Record<string, any[]> = { contacts: [], invoices: [], enrollments: [], email_tracking_logs: [] };
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    rpc: async () => ({ data: null, error: { message: 'forced fallback', code: 'XX000' } }),
    from: (table: string) => {
      const q: any = { select: () => q, eq: () => q, in: () => q, then: (r: any) => r({ data: db[table] ?? [], error: null }) };
      return q;
    },
  }),
}));

import { SegmentationCompiler, InvalidRuleGroupError } from '@/lib/intelligence/SegmentationCompiler';

const R = (field: string, operator: string, value: any) => ({ field, operator, value });
const G = (rules: any[], logic: any = 'AND') => ({ logic, rules });

describe('compileToSql', () => {
  it('"is not" uses IS DISTINCT FROM so NULL/empty values are INCLUDED (item 4)', () => {
    const { sql, params } = SegmentationCompiler.compileToSql('ws', G([R('source', 'not_equals', 'guest_checkout')]) as any);
    expect(sql).toContain('c.source IS DISTINCT FROM $2');
    expect(sql).not.toContain('!=');
    expect(params).toEqual(['ws', 'guest_checkout']);
  });

  it('throws on an unknown field instead of silently dropping it (item 2: used to compile to "all contacts")', () => {
    expect(() => SegmentationCompiler.compileToSql('ws', G([R('company', 'equals', 'Acme')]) as any)).toThrow(InvalidRuleGroupError);
  });

  it('throws on blank values (item 3)', () => {
    expect(() => SegmentationCompiler.compileToSql('ws', G([R('first_name', 'contains', '')]) as any)).toThrow(/Enter a value/);
  });

  it('a valid group still compiles as before', () => {
    const { sql } = SegmentationCompiler.compileToSql('ws', G([R('first_name', 'equals', 'A'), R('email', 'contains', '@')], 'OR') as any);
    expect(sql).toContain('c.first_name = $2');
    expect(sql).toContain("c.email ILIKE '%' || $3 || '%'");
    expect(sql).toContain(' OR ');
  });
});

describe('executeSegment JS fallback — semantics that must match the SQL path', () => {
  const contacts = [
    { id: 'a', workspace_id: 'ws', first_name: 'Ann', source: 'guest_checkout', tags: ['vip'] },
    { id: 'b', workspace_id: 'ws', first_name: 'Bob', source: null, tags: [] },        // NULL source
    { id: 'c', workspace_id: 'ws', first_name: 'Cy', source: '', tags: null },         // empty source
    { id: 'd', workspace_id: 'ws', first_name: 'Di', source: 'import', tags: [] },
  ];
  const run = async (rg: any) => { db.contacts = contacts; return (await SegmentationCompiler.executeSegment('ws', rg)).map((c: any) => c.id).sort(); };

  it('"is not" includes NULL and empty values (same as SQL IS DISTINCT FROM)', async () => {
    expect(await run(G([R('source', 'not_equals', 'guest_checkout')]))).toEqual(['b', 'c', 'd']);
  });

  it('unknown field ERRORS (was: silently matched nobody while SQL matched everyone)', async () => {
    await expect(run(G([R('company', 'equals', 'Acme')]))).rejects.toThrow(/Unknown segment field/);
  });

  it('blank value ERRORS (was: matched every contact)', async () => {
    await expect(run(G([R('first_name', 'contains', '')]))).rejects.toThrow(/Enter a value/);
    await expect(run(G([R('first_name', 'contains', '  ')]))).rejects.toThrow(/Enter a value/);
  });

  it('valid rules are unaffected (equals / contains / tags / AND / OR)', async () => {
    expect(await run(G([R('source', 'equals', 'import')]))).toEqual(['d']);
    expect(await run(G([R('first_name', 'contains', 'i')]))).toEqual(['d']); // "Di"; Ann/Bob/Cy have no 'i' (case-insens.)
    expect(await run(G([R('tags', 'equals', 'vip')]))).toEqual(['a']);
    expect(await run(G([R('source', 'equals', 'import'), R('tags', 'equals', 'vip')], 'OR'))).toEqual(['a', 'd']);
    expect(await run(G([R('source', 'equals', 'import'), R('tags', 'equals', 'vip')], 'AND'))).toEqual([]);
  });
});
