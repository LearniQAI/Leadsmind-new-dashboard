import { describe, expect, it, vi, beforeEach } from 'vitest';

const sendEmail = vi.fn();
vi.mock('@/lib/email', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));
vi.mock('@/shared/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

// in-memory booking_waitlists + appointments
let appointment: any;
let entries: any[]; // {id, position, offered_at, offer_expires_at, confirmed}
const updatesById: Record<string, any> = {};

function table(name: string) {
  const f: Record<string, any> = {};
  const api: any = {
    select: () => api,
    eq: (k: string, v: any) => { f[k] = v; return api; },
    not: () => api,
    is: (k: string, v: any) => { f[`is_${k}`] = v; return api; },
    gte: (k: string, v: any) => { f[`gte_${k}`] = v; return api; },
    gt: (k: string, v: any) => { f[`gt_${k}`] = v; return api; },
    lt: (k: string, v: any) => { f[`lt_${k}`] = v; return api; },
    order: () => api,
    maybeSingle: async () => {
      if (name === 'appointments') return { data: appointment };
      if (name === 'booking_waitlists') return { data: entries.find((e) => e.id === f.id) ?? null };
      return { data: null };
    },
    update: (payload: any) => ({
      eq: async (_k: string, id: string) => {
        updatesById[id] = { ...(updatesById[id] || {}), ...payload };
        const e = entries.find((x) => x.id === id);
        if (e) Object.assign(e, payload);
        return { error: null };
      },
    }),
    then: (resolve: any) => {
      let data: any[] = [];
      if (name === 'booking_waitlists') {
        data = entries
          .filter((e) => (f.confirmed !== undefined ? e.confirmed === f.confirmed : true))
          .filter((e) => (f.is_cancelled_at === null ? !e.cancelled_at : true))
          .filter((e) => (f.gte_offered_at ? e.offered_at && e.offered_at >= f.gte_offered_at : true))
          .filter((e) => (f.gt_offer_expires_at ? e.offer_expires_at && e.offer_expires_at > f.gt_offer_expires_at : true))
          .filter((e) => (f.lt_offer_expires_at ? e.offer_expires_at && e.offer_expires_at < f.lt_offer_expires_at : true))
          .sort((a, b) => a.position - b.position)
          .map((e) => ({ ...e }));
      }
      return Promise.resolve({ data }).then(resolve);
    },
  };
  return api;
}
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ from: (n: string) => table(n) }) }));

// loadEntry (sendWaitlistOfferEmail) needs contact + appointment embeds — give it a minimal shape
vi.mock('@/lib/calendar/waitlistToken', () => ({ generateWaitlistToken: (id: string) => `${id}.sig` }));

import { advanceWaitlistForAppointment, notifyNewlyOfferedWaitlist } from './waitlist';

const NOW = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();

beforeEach(() => {
  sendEmail.mockReset().mockResolvedValue({});
  for (const k of Object.keys(updatesById)) delete updatesById[k];
  appointment = { id: 'apt-1', max_attendees: 2, current_attendee_count: 1 };
  entries = [
    { id: 'w1', appointment_id: 'apt-1', position: 1, offered_at: null, offer_expires_at: null, confirmed: false, contact: { email: 'a@x.com', first_name: 'A' }, appointment: { title: 'Yoga', start_time: iso(NOW + 9e7), end_time: iso(NOW + 9e7 + 36e5), calendar: { name: 'Studio', timezone: 'UTC' } } },
    { id: 'w2', appointment_id: 'apt-1', position: 2, offered_at: null, offer_expires_at: null, confirmed: false, contact: { email: 'b@x.com', first_name: 'B' }, appointment: { title: 'Yoga', start_time: iso(NOW + 9e7), end_time: iso(NOW + 9e7 + 36e5), calendar: { name: 'Studio', timezone: 'UTC' } } },
  ];
});

describe('advanceWaitlistForAppointment', () => {
  it('offers the first never-offered person (by position) and emails them when a spot is free', async () => {
    const res = await advanceWaitlistForAppointment('apt-1');
    expect(res?.id).toBe('w1');
    expect(updatesById['w1'].offered_at).toBeTruthy();
    expect(updatesById['w1'].offer_expires_at).toBeTruthy();
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0].to).toBe('a@x.com');
  });

  it('does nothing when the session is full', async () => {
    appointment.current_attendee_count = 2;
    const res = await advanceWaitlistForAppointment('apt-1');
    expect(res).toBeNull();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('does nothing while someone already holds a live, unexpired offer', async () => {
    entries[0].offered_at = iso(NOW - 1000);
    entries[0].offer_expires_at = iso(NOW + 60 * 60 * 1000);
    const res = await advanceWaitlistForAppointment('apt-1');
    expect(res).toBeNull();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('advances PAST a person whose offer lapsed to the next never-offered person', async () => {
    entries[0].offered_at = iso(NOW - 3 * 60 * 60 * 1000);
    entries[0].offer_expires_at = iso(NOW - 60 * 60 * 1000); // lapsed
    const res = await advanceWaitlistForAppointment('apt-1');
    expect(res?.id).toBe('w2'); // skipped w1
    expect(sendEmail.mock.calls[0][0].to).toBe('b@x.com');
  });

  it('only comes back to a lapsed person if every remaining person has lapsed', async () => {
    entries[0].offered_at = iso(NOW - 4 * 3600e3);
    entries[0].offer_expires_at = iso(NOW - 2 * 3600e3);
    entries[1].offered_at = iso(NOW - 3 * 3600e3);
    entries[1].offer_expires_at = iso(NOW - 1 * 3600e3);
    const res = await advanceWaitlistForAppointment('apt-1');
    expect(res?.id).toBe('w1'); // earliest position among all-lapsed
  });
});

describe('notifyNewlyOfferedWaitlist', () => {
  it('emails whoever the DB trigger freshly offered (offered in the last minute, still live)', async () => {
    entries[0].offered_at = iso(NOW - 5000);
    entries[0].offer_expires_at = iso(NOW + 2 * 3600e3);
    await notifyNewlyOfferedWaitlist('apt-1');
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0].to).toBe('a@x.com');
  });

  it('falls back to advancing the queue itself when the trigger offered nobody', async () => {
    // no fresh offers -> notifyNewlyOfferedWaitlist calls advanceWaitlistForAppointment
    await notifyNewlyOfferedWaitlist('apt-1');
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0].to).toBe('a@x.com');
  });
});
