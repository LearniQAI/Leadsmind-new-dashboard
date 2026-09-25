import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({}) }));
import { PredictiveIntelligence } from './PredictiveIntelligence';

// Opens history -> optimal hour 9 (the default when there is none).
const at = (h: number, m: number) => { const d = new Date(2026, 8, 25, h, m, 30); return d; };

describe('getOptimizedSendTime', () => {
  it('sends immediately when the worker runs inside the optimal hour (was deferred forever)', async () => {
    vi.spyOn(PredictiveIntelligence, 'evaluateHistoricalOpens').mockResolvedValue(9);
    const now = at(9, 0);
    expect((await PredictiveIntelligence.getOptimizedSendTime({ id: 'c', workspace_id: 'w' }, now)).getTime()).toBe(now.getTime());
  });

  it('defers to the optimal hour later today, or tomorrow once it has passed', async () => {
    vi.spyOn(PredictiveIntelligence, 'evaluateHistoricalOpens').mockResolvedValue(9);
    const early = await PredictiveIntelligence.getOptimizedSendTime({ id: 'c' }, at(7, 10));
    expect([early.getDate(), early.getHours(), early.getMinutes()]).toEqual([25, 9, 0]);
    const late = await PredictiveIntelligence.getOptimizedSendTime({ id: 'c' }, at(14, 10));
    expect([late.getDate(), late.getHours()]).toEqual([26, 9]);
  });

  it('does not invent a load-shedding outage when no schedule source is configured', async () => {
    vi.spyOn(PredictiveIntelligence, 'evaluateHistoricalOpens').mockResolvedValue(9);
    const prev = process.env.ESKOM_API_KEY; delete process.env.ESKOM_API_KEY; delete process.env.ESKOM_TOKEN;
    const now = at(9, 5);
    const t = await PredictiveIntelligence.getOptimizedSendTime({ id: 'c', region: 'za-jhb' }, now);
    expect(t.getTime()).toBe(now.getTime());
    if (prev !== undefined) process.env.ESKOM_API_KEY = prev;
  });
});
