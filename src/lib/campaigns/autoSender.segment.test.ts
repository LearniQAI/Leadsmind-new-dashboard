import { describe, it, expect, vi, beforeEach } from 'vitest';

const logErr = vi.fn();
const send = vi.fn();
const upserts: any[] = [];
const state = { segmentRow: null as any, campaignSegment: null as any };
const GOOD = { logic: 'AND', rules: [{ field: 'source', operator: 'equals', value: 'zzsrc' }] };

vi.mock('@/shared/logger', () => ({ logger: { error: (...a: any[]) => logErr(...a), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/inngest', () => ({ inngest: { send: (...a: any[]) => send(...a) } }));
vi.mock('@/lib/campaigns/emailSuppression', () => ({ filterEmailableContactIds: async (_c: any, _w: string, ids: string[]) => ({ eligible: ids, excluded: 0 }) }));
vi.mock('@/lib/intelligence/SegmentationCompiler', async () => {
  const actual: any = await vi.importActual('@/lib/intelligence/SegmentationCompiler');
  // the contact belongs to the segment only when the test says so
  return { ...actual, SegmentationCompiler: { executeSegment: async () => [{ id: 'c1' }] } };
});
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      let op = 'select';
      const rows: Record<string, any> = {
        contacts: { data: { id: 'c1', tags: ['zzvip'] }, error: null },
        email_campaigns: { data: [{ id: 'camp1', segment: state.campaignSegment }], error: null },
        tag_assignments: { data: [], error: null },
        tags: { data: [], error: null },
        segments: { data: state.segmentRow, error: null },
        campaign_dispatch_queue: { data: [{ campaign_id: 'camp1' }], error: null },
      };
      const q: any = {
        select: () => q, eq: () => q, in: () => q, contains: () => q,
        upsert: (r: any) => { op = 'upsert'; upserts.push({ table, r }); return q; },
        maybeSingle: () => Promise.resolve(rows[table]),
        then: (r: any) => r(rows[table]),
      };
      void op;
      return q;
    },
  }),
}));
import { enqueueAutoSenderCampaigns } from '@/lib/campaigns/autoSender';

const setCampaign = (segment: any) => { state.campaignSegment = segment; };
beforeEach(() => { logErr.mockReset(); send.mockReset(); upserts.length = 0; state.segmentRow = null; });

describe('autoSender fails closed on an unavailable segment (item 1)', () => {
  it('a DELETED segment: campaign is skipped, nothing is enrolled, error is logged (was: enrolled on tags alone)', async () => {
    setCampaign({ tags: ['zzvip'], segmentId: 'gone', combineMode: 'AND', is_automated: true });
    state.segmentRow = null;
    const r = await enqueueAutoSenderCampaigns('ws', 'c1');
    expect(r).toEqual({ enrolled: 0, matched: 0 });
    expect(upserts.filter((u) => u.table === 'campaign_dispatch_queue')).toEqual([]);
    expect(send).not.toHaveBeenCalled();
    expect(logErr).toHaveBeenCalledWith(expect.objectContaining({ campaignId: 'camp1', segmentId: 'gone' }), 'campaign.auto_sender.segment_unavailable');
  });

  it('an INVALID stored segment also fails closed', async () => {
    setCampaign({ tags: ['zzvip'], segmentId: 's1', is_automated: true });
    state.segmentRow = { rule_group: { logic: 'AND', rules: [{ field: 'company', operator: 'equals', value: 'x' }] } };
    expect((await enqueueAutoSenderCampaigns('ws', 'c1')).enrolled).toBe(0);
    expect(logErr).toHaveBeenCalledWith(expect.anything(), 'campaign.auto_sender.segment_unavailable');
  });

  it('invalid ad-hoc rules (blank value) fail closed too', async () => {
    setCampaign({ tags: ['zzvip'], ruleGroup: { logic: 'AND', rules: [{ field: 'first_name', operator: 'contains', value: '' }] }, is_automated: true });
    expect((await enqueueAutoSenderCampaigns('ws', 'c1')).enrolled).toBe(0);
    expect(logErr).toHaveBeenCalledWith(expect.anything(), 'campaign.auto_sender.rules_invalid');
  });

  it('CONTROL: a live, valid segment still enrols a contact that is in it', async () => {
    setCampaign({ tags: ['zzvip'], segmentId: 's1', combineMode: 'AND', is_automated: true });
    state.segmentRow = { rule_group: GOOD };
    const r = await enqueueAutoSenderCampaigns('ws', 'c1');
    expect(r.matched).toBe(1);
    expect(upserts.some((u) => u.table === 'campaign_dispatch_queue')).toBe(true);
  });
});
