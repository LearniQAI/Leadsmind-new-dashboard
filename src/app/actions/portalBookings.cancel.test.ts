import { describe, expect, it, vi, beforeEach } from 'vitest';

const getPortalSession = vi.fn();
const notifyNewlyOfferedWaitlist = vi.fn();
const sendCancellationNotice = vi.fn();
const pushEventCancellation = vi.fn();

vi.mock('@/lib/portal/session', () => ({ getPortalSession: () => getPortalSession() }));
vi.mock('@/lib/calendar/waitlist', () => ({ notifyNewlyOfferedWaitlist: (...a: unknown[]) => notifyNewlyOfferedWaitlist(...a) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/shared/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/calendar/notifications', () => ({
  sendCancellationNotice: (...a: unknown[]) => sendCancellationNotice(...a),
  sendRescheduleNotice: vi.fn(),
  sendBookingConfirmation: vi.fn(),
}));
vi.mock('@/lib/calendar/calendarSync', () => ({
  pushEventCancellation: (...a: unknown[]) => pushEventCancellation(...a),
  pushEventTimeUpdate: vi.fn(),
  syncBookingToExternal: vi.fn(),
}));
vi.mock('@/lib/calendar/scheduling', () => ({ getAvailableSlots: vi.fn(), getRoundRobinAssignee: vi.fn() }));
vi.mock('@/lib/calendar/payfast', () => ({ createTemporaryBookingLease: vi.fn(), generatePayFastCheckoutUrl: vi.fn() }));
vi.mock('@/lib/calendar/crossConnect', () => ({ createSupportTicket: vi.fn() }));
vi.mock('@/lib/calendar/meetingLink', () => ({ resolveMeetingLink: vi.fn(), applyResolvedMeetingLink: (m: any) => m ?? {} }));
vi.mock('@/lib/calendar/bookingErrors', () => ({ isSlotConflictError: () => false, SLOT_CONFLICT_MESSAGE: 'conflict' }));

let apptRow: any;
const updatePayloads: any[] = [];
function makeClient() {
  return {
    from: (table: string) => {
      const api: any = {
        select: () => api,
        eq: () => api,
        single: async () => (table === 'appointments' ? { data: apptRow, error: null } : { data: null }),
        insert: async () => ({ error: null }),
        update: (payload: any) => {
          if (table === 'appointments') updatePayloads.push(payload);
          return { eq: async () => ({ error: null }) };
        },
      };
      return api;
    },
  };
}
vi.mock('@/lib/supabase/server', () => ({ createServerClient: async () => makeClient(), createAdminClient: () => makeClient() }));

import { cancelAppointmentFromPortal } from './portalBookings';

beforeEach(() => {
  updatePayloads.length = 0;
  notifyNewlyOfferedWaitlist.mockReset();
  sendCancellationNotice.mockReset().mockResolvedValue(undefined);
  pushEventCancellation.mockReset().mockResolvedValue(undefined);
  getPortalSession.mockReset().mockResolvedValue({
    contact: { id: 'c1' },
    workspace: { id: 'ws1' },
  });
  apptRow = {
    id: 'apt1', contact_id: 'c1', workspace_id: 'ws1', title: 'Yoga',
    start_time: new Date(Date.now() + 10 * 864e5).toISOString(),
    status: 'scheduled', max_attendees: 1, current_attendee_count: 0,
    calendar: { cancellation_window_hours: 24 },
  };
});

describe('cancelAppointmentFromPortal — group-session spot decrement fix', () => {
  it('GROUP session: decrements current_attendee_count AND triggers the waitlist', async () => {
    apptRow.max_attendees = 2;
    apptRow.current_attendee_count = 2;

    const res = await cancelAppointmentFromPortal('apt1');
    expect(res.success).toBe(true);

    const cancelUpdate = updatePayloads.find((p) => p.status === 'cancelled');
    expect(cancelUpdate.current_attendee_count).toBe(1); // 2 -> 1
    expect(notifyNewlyOfferedWaitlist).toHaveBeenCalledWith('apt1');
  });

  it('1:1 appointment: no decrement, no waitlist call (unchanged behavior)', async () => {
    const res = await cancelAppointmentFromPortal('apt1');
    expect(res.success).toBe(true);

    const cancelUpdate = updatePayloads.find((p) => p.status === 'cancelled');
    expect(cancelUpdate).not.toHaveProperty('current_attendee_count');
    expect(notifyNewlyOfferedWaitlist).not.toHaveBeenCalled();
  });

  it('group session already empty (count 0): still cancels, no negative count, no waitlist', async () => {
    apptRow.max_attendees = 2;
    apptRow.current_attendee_count = 0;
    const res = await cancelAppointmentFromPortal('apt1');
    expect(res.success).toBe(true);
    const cancelUpdate = updatePayloads.find((p) => p.status === 'cancelled');
    expect(cancelUpdate).not.toHaveProperty('current_attendee_count');
    expect(notifyNewlyOfferedWaitlist).not.toHaveBeenCalled();
  });
});
