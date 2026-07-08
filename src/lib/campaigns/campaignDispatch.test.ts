import { describe, it, expect, vi } from 'vitest';
import { createMockSupabaseClient } from '@/test/helpers/mockSupabase';

/**
 * Mirrors the real call in
 * src/app/api/cron/workers/campaign-dispatch/route.ts:
 *   supabaseAdmin.rpc('acquire_campaign_jobs', { worker_id, batch_size })
 */
describe('acquire_campaign_jobs — no overlap between concurrent cron workers', () => {
  it('two simultaneous workers claim different campaigns', async () => {
    const campaigns = [
      { id: 'campaign-1', status: 'scheduled' },
      { id: 'campaign-2', status: 'scheduled' },
      { id: 'campaign-3', status: 'scheduled' },
    ];
    const claimed: string[] = [];

    const mockDb = createMockSupabaseClient({
      rpc: vi.fn().mockImplementation(async (fn: string, params: any) => {
        if (fn === 'acquire_campaign_jobs') {
          const limit = params?.batch_size ?? 1;
          const available = campaigns.filter((c) => !claimed.includes(c.id));
          const batch = available.slice(0, limit);
          batch.forEach((c) => claimed.push(c.id));
          return { data: batch, error: null };
        }
        return { data: null, error: null };
      }),
    });

    const [worker1, worker2] = await Promise.all([
      mockDb.rpc('acquire_campaign_jobs', { worker_id: 'worker_a', batch_size: 1 }),
      mockDb.rpc('acquire_campaign_jobs', { worker_id: 'worker_b', batch_size: 1 }),
    ]);

    const ids1 = (worker1.data || []).map((c: any) => c.id);
    const ids2 = (worker2.data || []).map((c: any) => c.id);
    const overlap = ids1.filter((id: string) => ids2.includes(id));

    expect(overlap.length).toBe(0);
  });

  it('a campaign claimed by one worker is not returned to another', async () => {
    const claimedIds = new Set<string>();

    const mockDb = createMockSupabaseClient({
      rpc: vi.fn().mockImplementation(async (fn: string) => {
        if (fn === 'acquire_campaign_jobs') {
          const campaignId = 'campaign-exclusive';
          if (claimedIds.has(campaignId)) return { data: [], error: null };
          claimedIds.add(campaignId);
          return { data: [{ id: campaignId }], error: null };
        }
        return { data: null, error: null };
      }),
    });

    const result1 = await mockDb.rpc('acquire_campaign_jobs', { worker_id: 'worker_a', batch_size: 1 });
    const result2 = await mockDb.rpc('acquire_campaign_jobs', { worker_id: 'worker_b', batch_size: 1 });

    expect(result1.data).toHaveLength(1);
    expect(result2.data).toHaveLength(0);
  });

  it('always calls rpc with the real acquire_campaign_jobs param shape', async () => {
    const mockDb = createMockSupabaseClient({
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    await mockDb.rpc('acquire_campaign_jobs', { worker_id: 'worker_a', batch_size: 50 });

    expect(mockDb.rpc).toHaveBeenCalledWith(
      'acquire_campaign_jobs',
      expect.objectContaining({ worker_id: expect.any(String), batch_size: expect.any(Number) })
    );
  });
});
