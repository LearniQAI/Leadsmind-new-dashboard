// MANUAL ONLY. This hits the live project and writes real rows, so it never runs unless asked for:
//   - it is not matched by the main vitest config (src/** only) and so not by `npm test` or the Vercel build;
//   - even if someone points vitest at this file, the whole suite (and its hooks) is a no-op unless
//     RUN_LIVE_BOOKING_TESTS=1 is set. Run it with:  npm run test:live:booking
// Test rows are tagged: every appointment / recurring series this file creates has a title starting
// with "bkflow-" (and every calendar name with "bkflow-"), and the sweep deletes by that tag BOTH before
// (leftovers from a killed run) and after (this run) - so an interrupted run can't leave rows behind.
//
// Live verification of the staff booking path (BookingModal -> getStaffBookableSlots / createAppointment)
// under a REAL signed-in user session, against the live project, in Zain Workspace only.
//
// Only next/headers (cookie jar), next/cache and the outbound confirmation e-mail are replaced. Auth,
// requireWorkspaceAccess, RLS, validateSlot, the idempotency lookup and the appointments_no_overlap
// EXCLUDE constraint all run for real. ADMIN (service role) use: minting the sign-in OTP for the
// existing Zain Workspace admin, READ-ONLY assertions, and teardown of the rows this test created.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { createServerClient as ssrClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const RUN = process.env.RUN_LIVE_BOOKING_TESTS === '1';
const ZAIN_WS = 'b83f0966-837e-4952-9cd4-480be4ca3f16';
const ZAIN_ADMIN_EMAIL = 'zainalimuhammad5857@gmail.com';
const OTHER_WS_CONTACT_WS = '1f061259-810e-42a9-82a8-2a3836264b77';
const TAG = 'bkflow-';
const PREFIX = `${TAG}${randomUUID().slice(0, 8)}`;

let activeJar = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => (activeJar.has(name) ? { name, value: activeJar.get(name)! } : undefined),
    getAll: () => [...activeJar].map(([name, value]) => ({ name, value })),
    set: (a: any, b?: any) => { const n = typeof a === 'string' ? a : a.name; const v = typeof a === 'string' ? b : a.value; if (v) activeJar.set(n, v); else activeJar.delete(n); },
    delete: (name: string) => activeJar.delete(name),
  }),
  headers: () => new Headers(),
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
const mail = { sent: 0 };
// Failure injection for the "booking is saved first, follow-ups can only warn" tests. Default = normal behaviour.
const inject = vi.hoisted(() => ({ link: 'real' as 'real' | 'fail' | 'hang', mail: 'ok' as 'ok' | 'fail' | 'slow' }));
vi.mock('@/lib/calendar/notifications', async (orig) => ({
  ...(await orig<any>()),
  sendBookingConfirmation: async () => {
    if (inject.mail === 'fail') throw new Error('injected: email provider down');
    if (inject.mail === 'slow') await new Promise((r) => setTimeout(r, 12_000));
    mail.sent++; // no real e-mail from a test
  },
}));
vi.mock('@/lib/calendar/meetingLink', async (orig) => {
  const real = await orig<any>();
  return {
    ...real,
    resolveMeetingLink: (...args: any[]) => {
      if (inject.link === 'fail') return Promise.reject(new Error('injected: google api down'));
      if (inject.link === 'hang') return new Promise(() => {});
      return real.resolveMeetingLink(...args);
    },
  };
});

let admin: any;
let A: any;
let calendarId = '';
const createdIds = new Set<string>();
const report: Record<string, any> = {};

const slotISO = (d: Date) => d.toISOString();

let cachedDay: any = null;
const timing: Record<string, number> = {};
const timed = async (label: string, fn: () => Promise<any>): Promise<any> => { const t = Date.now(); try { return await fn(); } finally { timing[label] = Date.now() - t; process.stderr.write(`[timing] ${label}: ${Date.now() - t}ms
`); } };
async function freeDay() {
  if (cachedDay) return cachedDay;
  for (let i = 2; i <= 12; i++) {
    const d = new Date(Date.now() + i * 86_400_000);
    const date = d.toISOString().slice(0, 10);
    const r = await timed(`getStaffBookableSlots ${date}`, () => A.getStaffBookableSlots(calendarId, date));
    if (r.success && r.data.slots.length >= 8) return (cachedDay = { date, ...r.data }) as { date: string; timezone: string; slots: { start: string; end: string; timeLabel: string }[] };
  }
  throw new Error('no day with >= 8 free slots in the next 12 days');
}

const rowsByOp = async (op: string) => (await admin.from('appointments').select('*').eq('workspace_id', ZAIN_WS).eq('client_operation_id', op)).data as any[];
const book = (slot: { start: string; end: string }, extra: Record<string, any> = {}) =>
  timed('createAppointment', () => A.createAppointment({ calendarId, title: `${PREFIX} booking`, startTime: slot.start, endTime: slot.end, meetingMode: 'internal_meet', ...extra }));
const track = (r: any) => { if (r?.success && r.data?.id) createdIds.add(r.data.id); return r; };

/** Deletes every tagged test row in Zain Workspace (appointments, then series, then test calendars). */
async function sweepTaggedRows(): Promise<{ appointments: string[]; series: string[]; calendars: string[] }> {
  const del = async (table: string, col: string) => {
    const { data } = await admin.from(table).select('id').eq('workspace_id', ZAIN_WS).like(col, `${TAG}%`);
    const ids = (data ?? []).map((r: any) => r.id as string);
    if (ids.length) await admin.from(table).delete().eq('workspace_id', ZAIN_WS).in('id', ids);
    return ids;
  };
  const appointments = await del('appointments', 'title');
  const series = await del('recurring_series', 'title');
  const calendars = await del('booking_calendars', 'name');
  return { appointments, series, calendars };
}

beforeAll(async () => {
  if (!RUN) return;
  admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  // Real session for the existing Zain Workspace admin: ADMIN mints the OTP, the user client redeems it.
  const { data: link, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: ZAIN_ADMIN_EMAIL });
  if (error) throw new Error(`generateLink: ${error.message}`);
  const jar = new Map<string, string>();
  const user = ssrClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { get: (n: string) => jar.get(n), set: (n: string, v: string) => { jar.set(n, v); }, remove: (n: string) => { jar.delete(n); } },
  });
  const v = await user.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' });
  if (v.error) throw new Error(`verifyOtp: ${v.error.message}`);
  jar.set('active_workspace_id', ZAIN_WS);
  activeJar = jar;
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  A = await import('@/app/actions/calendar/appointments');
  // Leftovers from a previously killed run.
  report.staleSweep = await sweepTaggedRows();
  const { data: cals } = await admin.from('booking_calendars').select('id').eq('workspace_id', ZAIN_WS).not('name', 'like', `${TAG}%`).limit(1);
  calendarId = cals[0].id;
});

afterAll(async () => {
  if (!RUN) return;
  // Teardown always runs (pass or fail): ids this run tracked, plus everything carrying the tag.
  const ids = [...createdIds];
  if (ids.length) await admin.from('appointments').delete().eq('workspace_id', ZAIN_WS).in('id', ids);
  const swept = await sweepTaggedRows();
  const { count } = await admin.from('appointments').select('id', { count: 'exact', head: true }).like('title', `${TAG}%`);
  report.cleanup = { tracked_appointment_ids: ids, swept, remaining_tagged_appointments: count, e_mails_suppressed: mail.sent };
  // A passing vitest run swallows stdout, so persist the report where the caller can read it.
  if (process.env.BOOKING_REPORT_FILE) (await import('fs')).writeFileSync(process.env.BOOKING_REPORT_FILE, JSON.stringify({ report, timing }, null, 1));
});

describe.skipIf(!RUN)('staff booking flow (real session, Zain Workspace)', () => {
  it('availability: slots + explicit timezone for a free day; empty (no availability) beyond the horizon', async () => {
    const day = await freeDay();
    expect(day.timezone).toBeTruthy();
    expect(day.slots[0].timeLabel).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
    const far = await A.getStaffBookableSlots(calendarId, new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10));
    expect(far.success).toBe(true);
    expect(far.data.slots).toEqual([]);
    const bad = await A.getStaffBookableSlots('not-a-uuid', '2026-01-01');
    expect(bad.success).toBe(false);
    report.availability = { date: day.date, timezone: day.timezone, slotCount: day.slots.length, beyondHorizonSlots: far.data.slots.length };
  });

  it('book with NO contact (the confirmed root cause) succeeds and stores operation id + timezone', async () => {
    const day = await freeDay();
    const op = randomUUID();
    const r = track(await book(day.slots[0], { contactId: '', clientOperationId: op }));
    expect(r.success).toBe(true);
    const [row] = await rowsByOp(op);
    expect(row.contact_id).toBeNull();
    expect(row.status).toBe('scheduled');
    expect(row.metadata.booking_timezone).toBe(day.timezone);
    report.noContactBooking = { id: row.id, start: row.start_time, contact_id: row.contact_id, booking_timezone: row.metadata.booking_timezone };
  });

  it('replay with the same operation id returns the ORIGINAL booking (retry after a timeout)', async () => {
    const day = await freeDay();
    const op = randomUUID();
    const first = track(await book(day.slots[2], { clientOperationId: op }));
    const replay = track(await book(day.slots[2], { clientOperationId: op }));
    expect(first.success && replay.success).toBe(true);
    expect(replay.data.id).toBe(first.data.id);
    expect((await rowsByOp(op)).length).toBe(1);
    report.replay = { id: first.data.id, rowsForOperation: 1 };
  });

  it('double-click: two concurrent submits with one operation id create exactly one row', async () => {
    const day = await freeDay();
    const op = randomUUID();
    const [a, b] = await Promise.all([book(day.slots[4], { clientOperationId: op }), book(day.slots[4], { clientOperationId: op })]);
    track(a); track(b);
    expect(a.success && b.success).toBe(true);
    expect(a.data.id).toBe(b.data.id);
    expect((await rowsByOp(op)).length).toBe(1);
    report.doubleClick = { sameId: a.data.id === b.data.id, rows: 1 };
  });

  it('two tabs, same slot, different operation ids: exactly one wins, the other gets a clear message', async () => {
    const day = await freeDay();
    const slot = day.slots[6];
    const [a, b] = await Promise.all([book(slot, { clientOperationId: randomUUID() }), book(slot, { clientOperationId: randomUUID() })]);
    track(a); track(b);
    const winners = [a, b].filter((r) => r.success);
    const losers = [a, b].filter((r) => !r.success);
    expect(winners.length).toBe(1);
    expect(losers.length).toBe(1);
    expect(losers[0].error).toMatch(/just taken|conflicts with|no longer available/i);
    const { data: rows } = await admin.from('appointments').select('id').eq('workspace_id', ZAIN_WS).eq('calendar_id', calendarId).eq('status', 'scheduled').eq('start_time', slot.start);
    expect(rows.length).toBe(1);
    report.twoTabs = { winnerId: winners[0].data.id, loserMessage: losers[0].error, scheduledRowsAtSlot: rows.length };
  });

  it('rejects a malformed operation id and a contact from another workspace', async () => {
    const day = await freeDay();
    const bad = await book(day.slots[1], { clientOperationId: 'not-a-uuid' });
    expect(bad.success).toBe(false);
    expect(bad.error).toMatch(/Invalid booking request/);
    const { data: foreign } = await admin.from('contacts').select('id').eq('workspace_id', OTHER_WS_CONTACT_WS).limit(1);
    const x = await book(day.slots[1], { clientOperationId: randomUUID(), contactId: foreign[0].id });
    expect(x.success).toBe(false);
    expect(x.error).toMatch(/no longer exists/);
    report.validation = { badOperationId: bad.error, foreignContact: x.error };
  });

  it('after "refresh": the booking appears in the booking list AND the calendar page query', async () => {
    const day = await freeDay();
    const op = randomUUID();
    const r = track(await book(day.slots[10], { clientOperationId: op }));
    expect(r.success).toBe(true);
    const list = await A.getAppointments(); // booking list (AppointmentsList data source)
    expect(list.success).toBe(true);
    expect(list.data.some((a: any) => a.id === r.data.id)).toBe(true);
    // the exact query src/app/calendar/page.tsx runs (calendar view), through the user's own session
    const { createServerClient } = await import('@/lib/supabase/server');
    const sb = await createServerClient();
    const { data: page, error } = await sb
      .from('appointments')
      .select('*, contact:contacts(first_name, last_name, email), calendar:booking_calendars(name, calendar_type, price, timezone), resource:resources(name, type, location)')
      .eq('workspace_id', ZAIN_WS)
      .order('start_time', { ascending: false });
    expect(error).toBeNull();
    const hit = page!.find((a: any) => a.id === r.data.id);
    expect(hit).toBeTruthy();
    expect(hit.calendar?.name).toBeTruthy(); // join now present -> type filter + agenda calendar name work
    report.listAndCalendar = { id: r.data.id, inBookingList: true, inCalendarQuery: true, calendarName: hit.calendar.name };
  });

  // ---------------------------------------------------------------------------------------------
  // Staff mode: what staff CAN book now.
  // ---------------------------------------------------------------------------------------------
  it('staff mode: inside the minimum-notice window is allowed for staff, rejected by the public rules', async () => {
    const start = new Date(Math.ceil((Date.now() + 25 * 60_000) / 300_000) * 300_000); // ~25-30 min from now
    const slot = { start: start.toISOString(), end: new Date(start.getTime() + 30 * 60_000).toISOString() };
    const publicRules = await book(slot, { clientOperationId: randomUUID() }); // no staffBooking -> validateSlot
    expect(publicRules.success).toBe(false);
    const staff = track(await book(slot, { clientOperationId: randomUUID(), staffBooking: true }));
    expect(staff.success).toBe(true);
    report.staffInsideNotice = { publicRules: publicRules.error, staffBookingId: staff.data.id, start: slot.start };
  });

  it('staff mode: beyond the 30-day horizon and outside working hours (03:00 UTC) is allowed', async () => {
    const d = new Date(Date.now() + 60 * 86_400_000); d.setUTCHours(3, 0, 0, 0);
    const slot = { start: d.toISOString(), end: new Date(d.getTime() + 45 * 60_000).toISOString() };
    const r = track(await book(slot, { clientOperationId: randomUUID(), staffBooking: true }));
    expect(r.success).toBe(true);
    report.staffBeyondHorizon = { id: r.data.id, start: slot.start, daysAhead: 60 };
  });

  it('staff mode: custom off-grid time is allowed, but an overlap is still rejected by the database', async () => {
    const day = await freeDay();
    const base = new Date(day.slots[12].start);
    const start = new Date(base.getTime() + 7 * 60_000);
    const custom = { start: start.toISOString(), end: new Date(start.getTime() + 20 * 60_000).toISOString() };
    const ok = track(await book(custom, { clientOperationId: randomUUID(), staffBooking: true }));
    expect(ok.success).toBe(true);
    const shifted = new Date(start.getTime() + 5 * 60_000);
    const clash = await book({ start: shifted.toISOString(), end: new Date(shifted.getTime() + 20 * 60_000).toISOString() }, { clientOperationId: randomUUID(), staffBooking: true });
    expect(clash.success).toBe(false);
    expect(clash.error).toMatch(/overlaps an existing booking/);
    const { data: rows } = await admin.from('appointments').select('id').eq('workspace_id', ZAIN_WS).eq('calendar_id', calendarId).eq('status', 'scheduled').like('title', `${PREFIX}%`).gte('start_time', custom.start).lt('start_time', custom.end);
    expect(rows.length).toBe(1);
    report.staffCustomAndOverlap = { okId: ok.data.id, overlapMessage: clash.error };
  });

  it('staff mode: still rejects the past, and end <= start', async () => {
    const past = new Date(Date.now() - 2 * 3_600_000);
    const p = await book({ start: past.toISOString(), end: new Date(past.getTime() + 1_800_000).toISOString() }, { clientOperationId: randomUUID(), staffBooking: true });
    expect(p.success).toBe(false); expect(p.error).toMatch(/in the past/);
    const f = new Date(Date.now() + 40 * 86_400_000);
    const e = await book({ start: f.toISOString(), end: f.toISOString() }, { clientOperationId: randomUUID(), staffBooking: true });
    expect(e.success).toBe(false); expect(e.error).toMatch(/end after it starts/);
    report.staffSanity = { past: p.error, endBeforeStart: e.error };
  });

  // ---------------------------------------------------------------------------------------------
  // Booking is persisted FIRST; meeting link / confirmation e-mail can only produce warnings.
  // ---------------------------------------------------------------------------------------------
  it('follow-up failures never fail the booking: link error, link hang (5s cap), e-mail error and slow e-mail all save the row and return warnings', async () => {
    const at = (days: number) => { const d = new Date(Date.now() + days * 86_400_000); d.setUTCHours(11, 0, 0, 0); return { start: d.toISOString(), end: new Date(d.getTime() + 1_800_000).toISOString() }; };
    const results: Record<string, any> = {};
    try {
      inject.link = 'fail';
      const a = track(await book(at(80), { clientOperationId: randomUUID(), staffBooking: true }));
      expect(a.success).toBe(true);
      expect(a.data.warnings.join(' ')).toMatch(/meeting link could not be created. /);
      expect((await admin.from('appointments').select('id').eq('id', a.data.id)).data.length).toBe(1);
      results.linkFails = a.data.warnings;

      inject.link = 'hang';
      const t0 = Date.now();
      const b = track(await book(at(81), { clientOperationId: randomUUID(), staffBooking: true }));
      const hangMs = Date.now() - t0;
      expect(b.success).toBe(true);
      expect(hangMs).toBeLessThan(15_000); // 5s cap + the normal DB round trips, not forever
      expect(b.data.warnings.join(' ')).toMatch(/meeting link could not be created in time/);
      results.linkHangs = { ms: hangMs, warnings: b.data.warnings };

      inject.link = 'real'; inject.mail = 'fail';
      const c = track(await book(at(82), { clientOperationId: randomUUID(), staffBooking: true }));
      expect(c.success).toBe(true);
      expect(c.data.warnings.join(' ')).toMatch(/confirmation email could not be sent/);
      results.emailFails = c.data.warnings;

      inject.mail = 'slow';
      const t1 = Date.now();
      const d = track(await book(at(83), { clientOperationId: randomUUID(), staffBooking: true }));
      const slowMs = Date.now() - t1;
      expect(d.success).toBe(true);
      expect(d.data.warnings.join(' ')).toMatch(/taking longer than usual/);
      results.emailSlow = { ms: slowMs, warnings: d.data.warnings };

      const { data: rows } = await admin.from('appointments').select('id,status').in('id', [a.data.id, b.data.id, c.data.id, d.data.id]);
      expect(rows.length).toBe(4);
    } finally {
      inject.link = 'real'; inject.mail = 'ok';
    }
    report.followUpWarnings = results;
  });

  // ---------------------------------------------------------------------------------------------
  // /api/calendar/slots audit (the route is a thin wrapper over getStaffBookableSlots).
  // ---------------------------------------------------------------------------------------------
  it('slots audit: cross-workspace calendar id refused, no session refused, payload is availability-only', async () => {
    const { data: foreign } = await admin.from('booking_calendars').select('id').eq('workspace_id', OTHER_WS_CONTACT_WS).limit(1);
    const date = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    const cross = await A.getStaffBookableSlots(foreign[0].id, date);
    expect(cross.success).toBe(false);
    expect(cross.error).toMatch(/not found/i);
    const t0 = new Date(Date.now() + 5 * 86_400_000);
    const crossBook = await A.createAppointment({ calendarId: foreign[0].id, title: `${PREFIX} xws`, startTime: t0.toISOString(), endTime: new Date(t0.getTime() + 1_800_000).toISOString(), staffBooking: true });
    expect(crossBook.success).toBe(false);
    const saved = activeJar; activeJar = new Map();
    const anon = await A.getStaffBookableSlots(calendarId, date);
    activeJar = saved;
    expect(anon.success).toBe(false);
    expect(anon.error).toMatch(/unauthor/i);
    const own = await A.getStaffBookableSlots(calendarId, (await freeDay()).date);
    expect(Object.keys(own.data).sort()).toEqual(['slotDuration', 'slots', 'timezone']);
    for (const s of own.data.slots) expect(Object.keys(s).sort()).toEqual(['end', 'start', 'timeLabel']);
    expect(JSON.stringify(own.data)).not.toMatch(/bkflow|contact|email|title|appointmentId/i);
    report.slotsAudit = { crossWorkspace: cross.error, crossWorkspaceBook: crossBook.error, noSession: anon.error, topLevelKeys: Object.keys(own.data), slotKeys: Object.keys(own.data.slots[0]) };
  });

  // ---------------------------------------------------------------------------------------------
  // Recurring bookings: idempotent per series.
  // ---------------------------------------------------------------------------------------------
  it('recurring: replay and concurrent double-submit with one operation id create exactly one series', async () => {
    const R = await import('@/app/actions/calendar/recurringMeetings');
    const mk = (daysAhead: number, op: string) => {
      const d = new Date(Date.now() + daysAhead * 86_400_000); d.setUTCHours(10, 0, 0, 0);
      return R.createRecurringSeries({
        calendarId, title: `${PREFIX} series`, startTime: d.toISOString(), endTime: new Date(d.getTime() + 1_800_000).toISOString(),
        meetingMode: 'internal_meet', clientOperationId: op,
        recurrence: { frequency: 'weekly', interval: 1, count: 3, until: null },
      } as any);
    };
    const seriesFor = async (op: string) => (await admin.from('recurring_series').select('id, occurrence_count').eq('workspace_id', ZAIN_WS).eq('client_operation_id', op)).data as any[];
    const occCount = async (sid: string) => (await admin.from('appointments').select('id', { count: 'exact', head: true }).eq('series_id', sid)).count as number;

    const op1 = randomUUID();
    const first: any = await mk(70, op1);
    expect(first.success).toBe(true);
    const replay: any = await mk(70, op1);
    expect(replay.success).toBe(true);
    expect(replay.data.seriesId).toBe(first.data.seriesId);
    expect((await seriesFor(op1)).length).toBe(1);
    expect(await occCount(first.data.seriesId)).toBe(3);

    const op2 = randomUUID();
    const [a, b]: any[] = await Promise.all([mk(100, op2), mk(100, op2)]);
    expect(a.success && b.success).toBe(true);
    expect(a.data.seriesId).toBe(b.data.seriesId);
    expect((await seriesFor(op2)).length).toBe(1);
    expect(await occCount(a.data.seriesId)).toBe(3);

    const bad: any = await mk(130, 'not-a-uuid');
    expect(bad.success).toBe(false);
    report.recurring = { replaySameSeries: replay.data.seriesId === first.data.seriesId, occurrences: 3, concurrentSameSeries: a.data.seriesId === b.data.seriesId, seriesRowsPerOperation: 1, badOperationId: bad.error };
  });

});
