import { describe, expect, it, vi, beforeEach } from 'vitest';

const sendEmail = vi.fn();
vi.mock('@/lib/email', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));
vi.mock('@/shared/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/calendar/manageToken', () => ({ generateManageToken: (id: string) => `${id}.tok` }));

let appointmentRow: any;
let userRow: any;
let workspaceRow: any;
function from(table: string) {
  const api: any = {
    select: () => api,
    eq: () => api,
    maybeSingle: async () => ({ data: table === 'users' ? userRow : table === 'workspaces' ? workspaceRow : appointmentRow }),
    single: async () => ({ data: appointmentRow, error: appointmentRow ? null : 'x' }),
  };
  return api;
}
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ from }) }));

import { sendBookingConfirmation, sendRescheduleNotice, sendCancellationNotice } from './notifications';

const baseApt = () => ({
  id: 'apt-1', title: 'Discovery call',
  start_time: '2026-11-02T10:00:00Z', end_time: '2026-11-02T10:30:00Z',
  meeting_link: null as string | null, meeting_mode: 'internal_meet', status: 'scheduled',
  workspace_id: 'ws-1', user_id: 'host-1', calendar_id: 'cal-1', metadata: {} as any,
  contact: { first_name: 'Alice', last_name: 'A', email: 'alice@example.com' },
  calendar: { name: 'Sales', calendar_type: 'personal', timezone: 'UTC' },
});

beforeEach(() => {
  sendEmail.mockReset().mockResolvedValue({});
  appointmentRow = baseApt();
  userRow = { email: 'host@example.com', first_name: 'Hank', last_name: 'H' };
  workspaceRow = { owner_id: 'host-1' };
});

const bodyTo = (addr: string) => sendEmail.mock.calls.find((c) => c[0].to === addr)?.[0].text as string | undefined;

describe('sendBookingConfirmation — meeting-link states (Task 63/65)', () => {
  it('real Google Meet link → shows the link, no extra note', async () => {
    appointmentRow.meeting_link = 'https://meet.google.com/abc-defg-hij';
    appointmentRow.meeting_mode = 'google_meet';
    appointmentRow.metadata = { meeting_link_status: 'google_meet' };
    await sendBookingConfirmation('apt-1', { reason: 'booked' });
    const t = bodyTo('alice@example.com')!;
    expect(t).toContain('Meeting link: https://meet.google.com/abc-defg-hij');
    expect(t).not.toMatch(/coming soon/i);
  });

  it('zoom → NO link line + honest "coming soon" copy, never a zoom.us URL', async () => {
    appointmentRow.meeting_link = null;
    appointmentRow.meeting_mode = 'zoom';
    appointmentRow.metadata = { meeting_link_status: 'zoom_pending_integration' };
    await sendBookingConfirmation('apt-1', { reason: 'booked' });
    const t = bodyTo('alice@example.com')!;
    expect(t).not.toMatch(/Meeting link:/);
    expect(t).not.toMatch(/zoom\.us/);
    expect(t).toMatch(/coming soon/i);
  });

  it('waitlist promotion emails the override recipient, not appointments.contact', async () => {
    await sendBookingConfirmation('apt-1', { reason: 'waitlist_promoted', overrideRecipient: { email: 'carol@example.com', name: 'Carol' } });
    expect(sendEmail.mock.calls.some((c) => c[0].to === 'carol@example.com')).toBe(true);
    expect(sendEmail.mock.calls.some((c) => c[0].to === 'alice@example.com')).toBe(false);
    expect(sendEmail.mock.calls.find((c) => c[0].to === 'carol@example.com')![0].subject).toMatch(/off the waitlist/i);
  });
});

describe('calendar_sync_error surfacing (Task 65 Part 1 fix)', () => {
  it('reschedule → host email warns when the calendar sync failed; booker email does not', async () => {
    appointmentRow.metadata = { calendar_sync_error: { at: 'now', action: 'reschedule' } };
    await sendRescheduleNotice('apt-1', 'the old time');
    expect(bodyTo('host@example.com')).toMatch(/could not be synced to your connected Google\/Outlook calendar/i);
    expect(bodyTo('alice@example.com')).not.toMatch(/could not be synced/i);
  });

  it('cancel → host email warns; no marker → no warning', async () => {
    appointmentRow.metadata = { calendar_sync_error: { at: 'now', action: 'cancel' } };
    await sendCancellationNotice('apt-1', 'the time');
    expect(bodyTo('host@example.com')).toMatch(/could not be synced/i);

    sendEmail.mockClear();
    appointmentRow.metadata = {};
    await sendCancellationNotice('apt-1', 'the time');
    expect(bodyTo('host@example.com')).not.toMatch(/could not be synced/i);
  });
});
