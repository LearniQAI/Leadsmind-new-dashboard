import { describe, it, expect, vi } from 'vitest';

const h = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ rpc: h.rpc }) }));

import { SegmentationCompiler, InvalidRuleGroupError } from '@/lib/intelligence/SegmentationCompiler';

const G = (rules: any[]) => ({ logic: 'AND', rules }) as any;
const ok = G([{ field: 'first_name', operator: 'equals', value: 'A' }]);

describe('countSegment (count-only path)', () => {
  it('calls fn_count_segment_sql with the same compiled SQL/params and maps the aggregate row', async () => {
    h.rpc.mockReset();
    h.rpc.mockResolvedValue({ data: [{ total: '3000', email_reach: '2655', sms_reach: 1714 }], error: null });
    const res = await SegmentationCompiler.countSegment('ws', ok);
    const compiled = SegmentationCompiler.compileToSql('ws', ok);
    expect(h.rpc).toHaveBeenCalledWith('fn_count_segment_sql', { p_sql: compiled.sql, p_params: compiled.params });
    expect(res).toEqual({ total: 3000, emailReach: 2655, smsReach: 1714 });
  });

  it('returns null (caller falls back) when the RPC errors or throws', async () => {
    h.rpc.mockReset();
    h.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect(await SegmentationCompiler.countSegment('ws', ok)).toBeNull();
    h.rpc.mockReset();
    h.rpc.mockRejectedValue(new Error('network'));
    expect(await SegmentationCompiler.countSegment('ws', ok)).toBeNull();
  });

  it('rejects an invalid rule group before touching the database, like executeSegment', async () => {
    h.rpc.mockReset();
    await expect(SegmentationCompiler.countSegment('ws', G([{ field: 'nope', operator: 'equals', value: 'x' }]))).rejects.toThrow(InvalidRuleGroupError);
    expect(h.rpc).not.toHaveBeenCalled();
  });
});
