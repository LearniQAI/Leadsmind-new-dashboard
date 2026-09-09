import { describe, expect, it, vi, beforeEach } from 'vitest';

const updateGoogle = vi.fn();
const deleteGoogle = vi.fn();
const updateOutlook = vi.fn();
const deleteOutlook = vi.fn();
const dbUpdate = vi.fn();
let appointmentRow: any;

vi.mock('@/lib/calendar/googleMeet', () => ({
  updateGoogleCalendarEventTime: (...a: unknown[]) => updateGoogle(...a),
  deleteGoogleCalendarEvent: (...a: unknown[]) => deleteGoogle(...a),
}));
vi.mock('@/lib/calendar/outlookCalendarEvents', () => ({
  updateOutlookCalendarEventTime: (...a: unknown[]) => updateOutlook(...a),
  deleteOutlookCalendarEvent: (...a: unknown[]) => deleteOutlook(...a),
}));
vi.mock('@/shared/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/calendar/connections', () => ({
  getFreshCalendarAccessToken: vi.fn(),
  toCalendarConnectionRow: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: appointmentRow }) }) }),
      update: (payload: any) => {
        dbUpdate(payload);
        return { eq: async () => ({ error: null }) };
      },
    }),
  }),
}));

import { pushEventTimeUpdate, pushEventCancellation } from './calendarSync';

beforeEach(() => {
  updateGoogle.mockReset().mockResolvedValue('updated');
  deleteGoogle.mockReset().mockResolvedValue('updated');
  updateOutlook.mockReset().mockResolvedValue('updated');
  deleteOutlook.mockReset().mockResolvedValue('updated');
  dbUpdate.mockReset();
  appointmentRow = {
    id: 'apt-1',
    user_id: 'assignee-1',
    start_time: '2026-12-01T14:00:00Z',
    end_time: '2026-12-01T14:30:00Z',
    metadata: {},
  };
});

describe('pushEventTimeUpdate (reschedule → PATCH the calendar event)', () => {
  it('does nothing when the booking has no stored calendar event', async () => {
    const r = await pushEventTimeUpdate('apt-1');
    expect(r).toEqual({ attempted: false, failed: false, google: null, outlook: null });
    expect(updateGoogle).not.toHaveBeenCalled();
    expect(dbUpdate).not.toHaveBeenCalled();
  });

  it('PATCHes the Google event to the appointment\'s current time, using the stored host', async () => {
    appointmentRow.metadata = { google_event_id: 'gevt-1', calendar_event_host_user_id: 'host-9' };
    const r = await pushEventTimeUpdate('apt-1');
    expect(updateGoogle).toHaveBeenCalledWith('host-9', 'gevt-1', {
      startIso: '2026-12-01T14:00:00Z',
      endIso: '2026-12-01T14:30:00Z',
    });
    expect(r).toMatchObject({ attempted: true, failed: false, google: 'updated' });
  });

  it('falls back to appointments.user_id as the host when no explicit host is stored', async () => {
    appointmentRow.metadata = { google_event_id: 'gevt-1' };
    await pushEventTimeUpdate('apt-1');
    expect(updateGoogle).toHaveBeenCalledWith('assignee-1', 'gevt-1', expect.anything());
  });

  it('writes a calendar_sync_error marker when the provider rejects the update', async () => {
    appointmentRow.metadata = { google_event_id: 'gevt-1', calendar_event_host_user_id: 'host-9' };
    updateGoogle.mockResolvedValue('failed');
    const r = await pushEventTimeUpdate('apt-1');
    expect(r.failed).toBe(true);
    const written = dbUpdate.mock.calls.at(-1)![0].metadata;
    expect(written.calendar_sync_error).toMatchObject({ action: 'reschedule' });
    expect(written.google_event_id).toBe('gevt-1'); // id kept — a later retry can still find it
  });

  it('clears a prior calendar_sync_error once the sync succeeds again', async () => {
    appointmentRow.metadata = {
      google_event_id: 'gevt-1',
      calendar_event_host_user_id: 'host-9',
      calendar_sync_error: { at: 'earlier', action: 'reschedule' },
    };
    await pushEventTimeUpdate('apt-1');
    const written = dbUpdate.mock.calls.at(-1)![0].metadata;
    expect(written).not.toHaveProperty('calendar_sync_error');
  });

  it('handles both a Google and an Outlook event on the same booking', async () => {
    appointmentRow.metadata = { google_event_id: 'g1', outlook_event_id: 'o1', calendar_event_host_user_id: 'h' };
    const r = await pushEventTimeUpdate('apt-1');
    expect(updateGoogle).toHaveBeenCalled();
    expect(updateOutlook).toHaveBeenCalledWith('h', 'o1', expect.anything());
    expect(r).toMatchObject({ google: 'updated', outlook: 'updated' });
  });
});

describe('pushEventCancellation (cancel → DELETE the calendar event)', () => {
  it('deletes the Google event and strips the id from metadata on success', async () => {
    appointmentRow.metadata = { google_event_id: 'gevt-1', calendar_event_host_user_id: 'host-9', notes: 'keep me' };
    const r = await pushEventCancellation('apt-1');
    expect(deleteGoogle).toHaveBeenCalledWith('host-9', 'gevt-1');
    expect(r).toMatchObject({ attempted: true, failed: false, google: 'updated' });
    const written = dbUpdate.mock.calls.at(-1)![0].metadata;
    expect(written).not.toHaveProperty('google_event_id');
    expect(written.notes).toBe('keep me');
  });

  it('keeps the id + writes a marker when the delete fails (revoked token etc.)', async () => {
    appointmentRow.metadata = { google_event_id: 'gevt-1', calendar_event_host_user_id: 'host-9' };
    deleteGoogle.mockResolvedValue('failed');
    const r = await pushEventCancellation('apt-1');
    expect(r.failed).toBe(true);
    const written = dbUpdate.mock.calls.at(-1)![0].metadata;
    expect(written.google_event_id).toBe('gevt-1');
    expect(written.calendar_sync_error).toMatchObject({ action: 'cancel' });
  });

  it('no stored event => no-op, never throws', async () => {
    await expect(pushEventCancellation('apt-1')).resolves.toEqual({
      attempted: false,
      failed: false,
      google: null,
      outlook: null,
    });
  });
});
