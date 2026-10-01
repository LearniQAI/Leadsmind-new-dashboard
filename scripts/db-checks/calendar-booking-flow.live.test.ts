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

const ZAIN_WS = 'b83f0966-837e-4952-9cd4-480be4ca3f16';
const ZAIN_ADMIN_EMAIL = 'zainalimuhammad5857@gmail.com';
const OTHER_WS_CONTACT_WS = '1f061259-810e-42a9-82a8-2a3836264b77';
const PREFIX = `bkflow-${randomUUID().slice(0, 8)}`;

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
vi.mock('@/lib/calendar/notifications', async (orig) => ({
  ...(await orig<any>()),
  sendBookingConfirmation: async () => { mail.sent++; }, // no real e-mail from a test
}));

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

beforeAll(async () => {
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
  const { data: cals } = await admin.from('booking_calendars').select('id').eq('workspace_id', ZAIN_WS).limit(1);
  calendarId = cals[0].id;
});

afterAll(async () => {
  // Teardown: every appointment this run created (by id AND by title prefix as a safety net).
  const { data: byPrefix } = await admin.from('appointments').select('id').eq('workspace_id', ZAIN_WS).like('title', `${PREFIX}%`);
  for (const r of byPrefix ?? []) createdIds.add(r.id);
  const ids = [...createdIds];
  if (ids.length) await admin.from('appointments').delete().eq('workspace_id', ZAIN_WS).in('id', ids);
  const { count } = await admin.from('appointments').select('id', { count: 'exact', head: true }).like('title', `${PREFIX}%`);
  report.cleanup = { deleted_appointment_ids: ids, remaining_with_prefix: count, e_mails_suppressed: mail.sent };
  // A passing vitest run swallows stdout, so persist the report where the caller can read it.
  if (process.env.BOOKING_REPORT_FILE) (await import('fs')).writeFileSync(process.env.BOOKING_REPORT_FILE, JSON.stringify({ report, timing }, null, 1));
});

describe('staff booking flow (real session, Zain Workspace)', () => {
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
});
