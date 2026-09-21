import { describe, it, expect, vi, beforeEach } from 'vitest';

const inserts: any[] = [];
const state = { segment: null as any };

vi.mock('@/shared/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireWorkspaceAccess: async () => ({ workspaceId: 'w1', userId: 'u1' }) }));
vi.mock('@/lib/encryption', () => ({ decrypt: (s: string) => s }));
vi.mock('@/lib/intelligence/SegmentationCompiler', async () => {
  const actual: any = await vi.importActual('@/lib/intelligence/SegmentationCompiler');
  return { ...actual, SegmentationCompiler: { executeSegment: async () => [] } };
});
const fakeDb = () => ({
  from: (table: string) => {
    const q: any = {
      select: () => q, eq: () => q, in: () => q, contains: () => q, upsert: () => q,
      insert: (r: any) => { inserts.push({ table, r }); return q; },
      maybeSingle: () => Promise.resolve({ data: table === 'segments' ? state.segment : { id: 'conn' }, error: null }),
      single: () => Promise.resolve({ data: { id: 'new' }, error: null }),
      then: (r: any) => r({ data: [], error: null }),
    };
    return q;
  },
});
vi.mock('@/lib/supabase/server', () => ({ createServerClient: async () => fakeDb(), createAdminClient: () => fakeDb() }));

import { createBulkSmsCampaign } from '@/app/actions/bulk_sms';
import { createWhatsAppBroadcastCampaign } from '@/app/actions/whatsapp_broadcast';

beforeEach(() => { inserts.length = 0; state.segment = null; });

describe.each([
  ['SMS', (p: any) => createBulkSmsCampaign({ name: 'n', messageBody: 'hi', ...p })],
  ['WhatsApp', (p: any) => createWhatsAppBroadcastCampaign({ name: 'n', messageBody: 'hi', ...p })],
] as const)('%s campaign audience', (_name, create) => {
  it('a deleted segment errors CLEARLY before any row is written (was: a raw foreign-key constraint message)', async () => {
    state.segment = null;
    const r: any = await create({ segmentId: 'gone', tags: ['vip'] });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/no longer exists \(it was deleted\)/);
    expect(r.error).not.toMatch(/foreign key|constraint|violates/i);
    expect(inserts).toEqual([]);
  });

  it('an invalid saved segment errors clearly', async () => {
    state.segment = { rule_group: { logic: 'AND', rules: [{ field: 'first_name', operator: 'contains', value: '' }] } };
    const r: any = await create({ segmentId: 's1' });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/segment selected for this audience is invalid/);
    expect(inserts).toEqual([]);
  });

  it('blank or unknown ad-hoc rules are rejected', async () => {
    const blank: any = await create({ ruleGroup: { logic: 'AND', rules: [{ field: 'first_name', operator: 'contains', value: '' }] } });
    expect(blank.success).toBe(false); expect(blank.error).toMatch(/Enter a value/);
    const unknown: any = await create({ ruleGroup: { logic: 'AND', rules: [{ field: 'company', operator: 'equals', value: 'x' }] } });
    expect(unknown.success).toBe(false); expect(unknown.error).toMatch(/Unknown segment field/);
  });
});
