// Production (Vercel) runs UTC; scheduling.ts's zonedTimeToUtc is only correct
// when the process TZ is UTC (a pre-existing latent bug flagged in
// docs/calendar.md, out of scope here). Pin it so this test exercises the
// real production behaviour.
process.env.TZ = 'UTC';

import { describe, expect, it, vi } from 'vitest';

// Task 62 — downstream proof: a busy block on the host's connected external
// calendar (user_calendar_connections -> getExternalBusySlots) actually removes
// the overlapping slot from getAvailableSlots, the LIVE booking engine.

const getExternalBusySlots = vi.fn();

vi.mock('@/lib/calendar/calendarSync', () => ({
  getExternalBusySlots: (...a: unknown[]) => getExternalBusySlots(...a),
}));
vi.mock('@/lib/calendar/saHolidays', () => ({ getHolidaysInRange: vi.fn().mockResolvedValue([]) }));
vi.mock('@/lib/calendar/eskomsepush', () => ({ getEskomOutages: vi.fn().mockResolvedValue([]) }));
vi.mock('@/shared/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/auth', () => ({ getCurrentWorkspaceId: vi.fn().mockResolvedValue('ws-1') }));

const HANDLERS: Record<string, () => { data: any; error: null }> = {
  booking_calendars: () => ({
    data: {
      id: 'cal-1',
      workspace_id: 'ws-1',
      calendar_type: 'personal',
      timezone: 'UTC',
      slot_duration: 60,
      buffer_time: 0,
      price: 0,
      availability: Object.fromEntries(
        ['0', '1', '2', '3', '4', '5', '6'].map((d) => [d, [{ start: '09:00', end: '17:00' }]])
      ),
    },
    error: null,
  }),
  round_robin_assignment: () => ({ data: null, error: null }),
  host_availability_profiles: () => ({ data: null, error: null }),
  meet_date_overrides: () => ({ data: null, error: null }),
  appointments: () => ({ data: [], error: null }),
  booking_leases: () => ({ data: [], error: null }),
  users: () => ({ data: null, error: null }),
  workspaces: () => ({ data: { owner_id: 'owner-1' }, error: null }),
};

function makeClient() {
  return {
    from(table: string) {
      const resolve = () => HANDLERS[table]?.() ?? { data: null, error: null };
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        gte: () => builder,
        lte: () => builder,
        or: () => builder,
        limit: () => builder,
        order: () => builder,
        single: async () => resolve(),
        maybeSingle: async () => resolve(),
        then: (res: any, rej: any) => Promise.resolve(resolve()).then(res, rej),
      };
      return builder;
    },
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => makeClient(),
  createServerClient: async () => makeClient(),
}));

import { getAvailableSlots } from './scheduling';

function futureWeekdayISODate(): string {
  const d = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split('T')[0];
}

describe('getAvailableSlots — external calendar busy integration (Task 62)', () => {
  it('removes exactly the slot overlapping an external busy block, keeps the rest', async () => {
    const date = futureWeekdayISODate();
    getExternalBusySlots.mockReset();
    getExternalBusySlots.mockResolvedValue([
      { start: `${date}T10:00:00.000Z`, end: `${date}T11:00:00.000Z` },
    ]);

    const slots = await getAvailableSlots('cal-1', date);
    const starts = slots.map((s: any) => s.start);

    // resolved the host to the workspace owner and asked for that host's busy times
    expect(getExternalBusySlots).toHaveBeenCalledWith('owner-1', `${date}T00:00:00Z`, `${date}T23:59:59Z`);

    expect(starts).toContain(`${date}T09:00:00.000Z`);
    expect(starts).not.toContain(`${date}T10:00:00.000Z`); // blocked by external event
    expect(starts).toContain(`${date}T11:00:00.000Z`);
  });

  it('returns the full set when the host has no external calendar (empty busy list)', async () => {
    const date = futureWeekdayISODate();
    getExternalBusySlots.mockReset();
    getExternalBusySlots.mockResolvedValue([]);

    const slots = await getAvailableSlots('cal-1', date);
    const starts = slots.map((s: any) => s.start);
    expect(starts).toContain(`${date}T10:00:00.000Z`);
  });

  it('never lets an external-provider failure break slot loading', async () => {
    const date = futureWeekdayISODate();
    getExternalBusySlots.mockReset();
    getExternalBusySlots.mockImplementation(async () => {
      throw new Error('Google 503');
    });

    let thrown: unknown = null;
    let slots: any[] = [];
    try {
      slots = await getAvailableSlots('cal-1', date);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeNull();
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.map((s: any) => s.start)).toContain(`${date}T10:00:00.000Z`);
  });
});
