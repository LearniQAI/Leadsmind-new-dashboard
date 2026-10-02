import { beforeEach, describe, expect, it, vi } from 'vitest';

let flag = true;
vi.mock('@/lib/featureFlags/aiResearch', () => ({ get AI_RESEARCH_ENABLED() { return flag; } }));
vi.mock('@/lib/api/workspaceAuth', () => ({ requireWorkspaceRole: async () => ({ workspaceId: 'ws1' }) }));
vi.mock('@/shared/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }, safeLog: (fn: () => void) => fn() }));
vi.mock('@/shared/logger/requestTiming', () => ({ createStepTimer: () => ({ mark: () => {}, steps: () => ({}), totalMs: () => 0 }), logRequestComplete: vi.fn() }));

const contacts: Record<string, any> = {};
vi.mock('@/server/database/datasource', () => ({
  db: (table: string) => ({
    where: (c: any) => ({ first: async () => (table === 'contacts' ? contacts[c.id] ?? null : null) }),
  }),
}));

const enrich = vi.fn();
vi.mock('@/server/services/ai/ResearchAgent', () => {
  class ResearchFailedError extends Error {
    constructor(public code: string) { super(code); }
  }
  return { ResearchFailedError, ResearchAgent: { enrichContact: (...a: unknown[]) => enrich(...a) } };
});

import { POST } from './route';
import { ResearchFailedError } from '@/server/services/ai/ResearchAgent';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const call = (body: unknown) => POST(new Request('http://x/api/v1/ai/research/batch', { method: 'POST', body: JSON.stringify(body) }) as any);

beforeEach(() => {
  vi.clearAllMocks();
  flag = true;
  contacts[A] = { id: A, first_name: 'Ada', last_name: 'L', email: 'ada@acme.com' };
  contacts[B] = { id: B, first_name: 'Bob', last_name: 'M', email: 'bob@gmail.com' };
});

describe('POST /api/v1/ai/research/batch', () => {
  it('is unavailable while the flag is off', async () => {
    flag = false;
    expect((await call({ contactIds: [A] })).status).toBe(404);
    expect(enrich).not.toHaveBeenCalled();
  });

  it('rejects a non-UUID contact id with 400 before any work', async () => {
    const res = await call({ contactIds: ['test-contact-id'] });
    expect(res.status).toBe(400);
    expect(enrich).not.toHaveBeenCalled();
  });

  it('rejects more than 5 contacts', async () => {
    const ids = Array.from({ length: 6 }, (_, i) => `00000000-0000-4000-8000-00000000000${i}`);
    expect((await call({ contactIds: ids })).status).toBe(400);
  });

  it('all items fail: failed status (not success:true)', async () => {
    enrich.mockRejectedValue(new ResearchFailedError('timeout'));
    const res = await call({ contactIds: [A] });
    const body = await res.json();
    expect(res.status).toBe(502);
    expect(body.success).toBe(false);
    expect(body.details[0]).toMatchObject({ success: false, error: 'timeout' });
  });

  it('out of credits for every item returns 402', async () => {
    enrich.mockRejectedValue(new ResearchFailedError('insufficient_credits'));
    expect((await call({ contactIds: [A] })).status).toBe(402);
  });

  it('partial failure: success:false with failedCount, 200', async () => {
    enrich.mockResolvedValueOnce({ schema_version: 2 });
    const res = await call({ contactIds: [A, B] }); // B only has a free-mail address -> no_company_domain
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(false);
    expect(body.failedCount).toBe(1);
    expect(body.details.find((d: any) => d.contactId === B).error).toBe('no_company_domain');
  });

  it('success: charges via the agent exactly once per contact (duplicates collapsed)', async () => {
    enrich.mockResolvedValue({ schema_version: 2 });
    const res = await call({ contactIds: [A, A] });
    expect((await res.json()).success).toBe(true);
    expect(enrich).toHaveBeenCalledTimes(1);
    expect(enrich.mock.calls[0][6]).toEqual({ chargeCredit: true });
  });
});
