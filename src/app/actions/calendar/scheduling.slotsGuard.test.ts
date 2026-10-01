import { describe, it, expect, vi, beforeEach } from 'vitest';

// getAvailableSlots is reachable without a session (public booking page, portal) and each call costs ~8 queries plus an
// external-calendar lookup. These tests pin the guard in front of all of that.

const createAdminClient = vi.fn();
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => createAdminClient() }));
vi.mock('@/lib/calendar/calendarSync', () => ({ getExternalBusySlots: vi.fn().mockResolvedValue([]) }));
vi.mock('@/lib/calendar/saHolidays', () => ({ getHolidaysInRange: vi.fn().mockResolvedValue([]) }));
vi.mock('@/lib/calendar/eskomsepush', () => ({ getEskomOutages: vi.fn().mockResolvedValue([]) }));
vi.mock('@/shared/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/auth', () => ({ getCurrentWorkspaceId: vi.fn().mockResolvedValue('ws-1') }));

let currentIp: string | null = '203.0.113.7';
vi.mock('next/headers', () => ({
  headers: () => {
    if (currentIp === null) throw new Error('headers() called outside a request scope');
    return new Headers({ 'x-forwarded-for': `${currentIp}, 10.0.0.1` });
  },
}));

import { getAvailableSlots } from './scheduling';
import { resetRateLimits } from '@/lib/rateLimit';

const CAL = '6b62c09a-4b43-4027-9183-a849b2423dfb';
const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

beforeEach(() => {
  resetRateLimits();
  currentIp = '203.0.113.7';
  // a calendar that does not exist: the function returns [] after the first lookup, which is all we need to see "was the DB touched"
  createAdminClient.mockReset().mockReturnValue({
    from: () => { const api: any = { select: () => api, eq: () => api, single: async () => ({ data: null }), maybeSingle: async () => ({ data: null }) }; return api; },
  });
});

describe('getAvailableSlots input validation', () => {
  it.each([
    ['not-a-uuid', iso(3)],
    ['', iso(3)],
    [CAL, '2026-13-01'],
    [CAL, '2026-02-31'],
    [CAL, '20261001'],
    [CAL, "2026-10-08' or 1=1 --"],
    [CAL, ''],
    [CAL, iso(63)],   // beyond today + 62 days
    [CAL, iso(-2)],   // before yesterday
  ])('rejects (%s, %s) with [] and never touches the database', async (id, date) => {
    expect(await getAvailableSlots(id as string, date as string)).toEqual([]);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('accepts today + 62 days and yesterday (reaches the database)', async () => {
    await getAvailableSlots(CAL, iso(62));
    await getAvailableSlots(CAL, iso(-1));
    expect(createAdminClient).toHaveBeenCalledTimes(2);
  });

  it('non-string input cannot throw', async () => {
    expect(await getAvailableSlots(undefined as any, undefined as any)).toEqual([]);
    expect(await getAvailableSlots(CAL, 20261001 as any)).toEqual([]);
  });
});

describe('getAvailableSlots per-IP rate limit', () => {
  it('allows 60 calls per minute from one IP, then throws a clear error; another IP is unaffected', async () => {
    for (let i = 0; i < 60; i++) await getAvailableSlots(CAL, iso(3));
    await expect(getAvailableSlots(CAL, iso(3))).rejects.toThrow(/Too many availability requests/);
    currentIp = '198.51.100.9';
    await expect(getAvailableSlots(CAL, iso(3))).resolves.toEqual([]);
  });

  it('rejected (malformed) input does not spend the budget', async () => {
    for (let i = 0; i < 100; i++) await getAvailableSlots('nope', iso(3));
    await expect(getAvailableSlots(CAL, iso(3))).resolves.toEqual([]);
  });

  it('outside a request (cron/script, no headers) is not limited', async () => {
    currentIp = null;
    for (let i = 0; i < 80; i++) await getAvailableSlots(CAL, iso(3));
    expect(createAdminClient).toHaveBeenCalledTimes(80);
  });
});
