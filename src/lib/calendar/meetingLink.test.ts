import { describe, expect, it, vi, beforeEach } from 'vitest';

const getCalendarConnection = vi.fn();
const createGoogleMeetLink = vi.fn();
const createZoomMeeting = vi.fn();
const createTeamsMeeting = vi.fn();
const ownerLookup = vi.fn();

vi.mock('@/lib/calendar/connections', () => ({
  getCalendarConnection: (...a: unknown[]) => getCalendarConnection(...a),
}));
vi.mock('@/lib/calendar/googleMeet', () => ({
  createGoogleMeetLink: (...a: unknown[]) => createGoogleMeetLink(...a),
}));
vi.mock('@/lib/calendar/zoomMeeting', () => ({
  createZoomMeeting: (...a: unknown[]) => createZoomMeeting(...a),
}));
vi.mock('@/lib/calendar/teamsMeeting', () => ({
  createTeamsMeeting: (...a: unknown[]) => createTeamsMeeting(...a),
}));
vi.mock('@/shared/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ownerLookup() }) }),
    }),
  }),
}));

import { resolveMeetingLink, meetingLinkNote, applyResolvedMeetingLink } from './meetingLink';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const base = {
  appointmentId: 'apt-1',
  hostUserId: 'host-1' as string | null,
  workspaceId: 'ws-1',
  calendarCustomLink: null as string | null,
  title: 'Discovery call',
  startTime: '2026-10-01T10:00:00.000Z',
  endTime: '2026-10-01T10:30:00.000Z',
};

const NO_EVENT = { googleCalendarEventId: null, calendarEventHostUserId: null };

describe('resolveMeetingLink — never emits a fabricated link', () => {
  beforeEach(() => {
    getCalendarConnection.mockReset();
    createGoogleMeetLink.mockReset().mockResolvedValue({ link: null, eventId: null });
    createZoomMeeting.mockReset().mockResolvedValue({ link: null, meetingId: null });
    createTeamsMeeting.mockReset().mockResolvedValue({ link: null, meetingId: null });
    ownerLookup.mockReset().mockResolvedValue({ data: { owner_id: 'owner-1' } });
  });

  describe('zoom (Task 70)', () => {
    it('host connected + real Zoom link => carries the join URL AND the meeting id', async () => {
      getCalendarConnection.mockResolvedValue({ id: 'zc-1' });
      createZoomMeeting.mockResolvedValue({ link: 'https://us05web.zoom.us/j/8123?pwd=x', meetingId: '81234567890' });
      const r = await resolveMeetingLink({ ...base, requestedMode: 'zoom' });
      expect(r.meetingLink).toBe('https://us05web.zoom.us/j/8123?pwd=x');
      expect(r.meetingMode).toBe('zoom');
      expect(r.status).toBe('zoom');
      expect(r.zoomMeetingId).toBe('81234567890');
      expect(r.calendarEventHostUserId).toBe('host-1');
      expect(getCalendarConnection).toHaveBeenCalledWith('host-1', 'zoom');
    });

    it('host connected but Zoom API fails => working internal room, status zoom_unavailable (NEVER a fake zoom.us URL)', async () => {
      getCalendarConnection.mockResolvedValue({ id: 'zc-1' });
      createZoomMeeting.mockResolvedValue({ link: null, meetingId: null });
      const r = await resolveMeetingLink({ ...base, requestedMode: 'zoom' });
      expect(r).toEqual({ meetingLink: `${APP_URL}/meet/apt-1`, meetingMode: 'internal_meet', status: 'zoom_unavailable', ...NO_EVENT });
    });

    it('host has NOT connected Zoom => working internal room, status zoom_pending_connection', async () => {
      getCalendarConnection.mockResolvedValue(null);
      const r = await resolveMeetingLink({ ...base, requestedMode: 'zoom' });
      expect(r).toEqual({ meetingLink: `${APP_URL}/meet/apt-1`, meetingMode: 'internal_meet', status: 'zoom_pending_connection', ...NO_EVENT });
      expect(createZoomMeeting).not.toHaveBeenCalled();
    });
  });

  describe('teams (Task 70)', () => {
    it('host connected (Outlook) + real Teams link => carries joinWebUrl AND the meeting id', async () => {
      getCalendarConnection.mockResolvedValue({ id: 'oc-1' });
      createTeamsMeeting.mockResolvedValue({ link: 'https://teams.microsoft.com/l/meetup-join/xyz', meetingId: 'MSPxyz==' });
      const r = await resolveMeetingLink({ ...base, requestedMode: 'teams' });
      expect(r.meetingLink).toBe('https://teams.microsoft.com/l/meetup-join/xyz');
      expect(r.meetingMode).toBe('teams');
      expect(r.status).toBe('teams');
      expect(r.teamsMeetingId).toBe('MSPxyz==');
      expect(r.calendarEventHostUserId).toBe('host-1');
      // reuses the SAME outlook connection — no separate teams provider
      expect(getCalendarConnection).toHaveBeenCalledWith('host-1', 'outlook');
    });

    it('host connected but Graph fails => internal room, status teams_unavailable', async () => {
      getCalendarConnection.mockResolvedValue({ id: 'oc-1' });
      createTeamsMeeting.mockResolvedValue({ link: null, meetingId: null });
      const r = await resolveMeetingLink({ ...base, requestedMode: 'teams' });
      expect(r).toEqual({ meetingLink: `${APP_URL}/meet/apt-1`, meetingMode: 'internal_meet', status: 'teams_unavailable', ...NO_EVENT });
    });

    it('host has NOT connected Microsoft => internal room, status teams_pending_connection', async () => {
      getCalendarConnection.mockResolvedValue(null);
      const r = await resolveMeetingLink({ ...base, requestedMode: 'teams' });
      expect(r.status).toBe('teams_pending_connection');
      expect(createTeamsMeeting).not.toHaveBeenCalled();
    });
  });

  it('internal_meet => the real /meet/[id] room', async () => {
    const r = await resolveMeetingLink({ ...base, requestedMode: 'internal_meet' });
    expect(r).toEqual({ meetingLink: `${APP_URL}/meet/apt-1`, meetingMode: 'internal_meet', status: 'internal', ...NO_EVENT });
  });

  it('custom_link with a configured URL => that URL', async () => {
    const r = await resolveMeetingLink({ ...base, requestedMode: 'custom_link', calendarCustomLink: 'https://example.com/room' });
    expect(r).toEqual({ meetingLink: 'https://example.com/room', meetingMode: 'custom_link', status: 'custom', ...NO_EVENT });
  });

  it('custom_link with no URL => internal room (no fake)', async () => {
    const r = await resolveMeetingLink({ ...base, requestedMode: 'custom_link' });
    expect(r.meetingLink).toBe(`${APP_URL}/meet/apt-1`);
    expect(r.meetingMode).toBe('internal_meet');
  });

  it('phone => no link, no fake', async () => {
    const r = await resolveMeetingLink({ ...base, requestedMode: 'phone' });
    expect(r).toEqual({ meetingLink: null, meetingMode: 'phone', status: 'none', ...NO_EVENT });
  });

  it('in_person => keeps the configured address, no video link status', async () => {
    const r = await resolveMeetingLink({ ...base, requestedMode: 'in_person', calendarCustomLink: '10 Main St' });
    expect(r).toEqual({ meetingLink: '10 Main St', meetingMode: 'in_person', status: 'none', ...NO_EVENT });
  });

  describe('google_meet', () => {
    it('host connected + Meet API returns a real link + event id => link AND the event id are carried through', async () => {
      getCalendarConnection.mockResolvedValue({ id: 'conn-1' });
      createGoogleMeetLink.mockResolvedValue({ link: 'https://meet.google.com/abc-defg-hij', eventId: 'gcal-evt-1' });
      const r = await resolveMeetingLink({ ...base, requestedMode: 'google_meet' });
      expect(r).toEqual({
        meetingLink: 'https://meet.google.com/abc-defg-hij',
        meetingMode: 'google_meet',
        status: 'google_meet',
        googleCalendarEventId: 'gcal-evt-1',
        calendarEventHostUserId: 'host-1',
      });
      expect(createGoogleMeetLink).toHaveBeenCalledWith(
        { title: 'Discovery call', start_time: base.startTime, end_time: base.endTime },
        'host-1'
      );
    });

    it('real link but no event id back => still a real link, but no event to track later', async () => {
      getCalendarConnection.mockResolvedValue({ id: 'conn-1' });
      createGoogleMeetLink.mockResolvedValue({ link: 'https://meet.google.com/live', eventId: null });
      const r = await resolveMeetingLink({ ...base, requestedMode: 'google_meet' });
      expect(r.meetingLink).toBe('https://meet.google.com/live');
      expect(r.googleCalendarEventId).toBeNull();
      expect(r.calendarEventHostUserId).toBeNull();
    });

    it('host connected but Meet API fails => working internal room, status google_meet_unavailable (NOT a fake meet.google.com URL)', async () => {
      getCalendarConnection.mockResolvedValue({ id: 'conn-1' });
      createGoogleMeetLink.mockResolvedValue({ link: null, eventId: null });
      const r = await resolveMeetingLink({ ...base, requestedMode: 'google_meet' });
      expect(r).toEqual({
        meetingLink: `${APP_URL}/meet/apt-1`,
        meetingMode: 'internal_meet',
        status: 'google_meet_unavailable',
        ...NO_EVENT,
      });
    });

    it('host has NOT connected Google => working internal room, status google_meet_pending_connection', async () => {
      getCalendarConnection.mockResolvedValue(null);
      const r = await resolveMeetingLink({ ...base, requestedMode: 'google_meet' });
      expect(r).toEqual({
        meetingLink: `${APP_URL}/meet/apt-1`,
        meetingMode: 'internal_meet',
        status: 'google_meet_pending_connection',
        ...NO_EVENT,
      });
      expect(createGoogleMeetLink).not.toHaveBeenCalled();
    });

    it('no explicit host => falls back to the workspace owner for the connection lookup', async () => {
      getCalendarConnection.mockResolvedValue({ id: 'conn-1' });
      createGoogleMeetLink.mockResolvedValue({ link: 'https://meet.google.com/xyz', eventId: 'e1' });
      const r = await resolveMeetingLink({ ...base, requestedMode: 'google_meet', hostUserId: null });
      expect(getCalendarConnection).toHaveBeenCalledWith('owner-1', 'google');
      expect(r.calendarEventHostUserId).toBe('owner-1');
    });

    it('no host and no workspace owner => still a real internal room, never a fake link', async () => {
      ownerLookup.mockResolvedValue({ data: null });
      const r = await resolveMeetingLink({ ...base, requestedMode: 'google_meet', hostUserId: null });
      expect(r.meetingLink).toBe(`${APP_URL}/meet/apt-1`);
      expect(r.status).toBe('google_meet_pending_connection');
    });
  });

  it('unknown mode => real internal room, never a fake link', async () => {
    const r = await resolveMeetingLink({ ...base, requestedMode: 'something_new' });
    expect(r.meetingLink).toBe(`${APP_URL}/meet/apt-1`);
    expect(r.status).toBe('internal');
  });
});

describe('applyResolvedMeetingLink', () => {
  it('records the google event id + host only when a real event was created', () => {
    const withEvent = applyResolvedMeetingLink(
      { notes: 'x' },
      { meetingLink: 'l', meetingMode: 'google_meet', status: 'google_meet', googleCalendarEventId: 'evt-9', calendarEventHostUserId: 'u-9' }
    );
    expect(withEvent).toEqual({
      notes: 'x',
      meeting_link_status: 'google_meet',
      google_event_id: 'evt-9',
      calendar_event_host_user_id: 'u-9',
    });

    const noEvent = applyResolvedMeetingLink(
      { notes: 'x' },
      { meetingLink: null, meetingMode: 'zoom', status: 'zoom_pending_integration', googleCalendarEventId: null, calendarEventHostUserId: null }
    );
    expect(noEvent).toEqual({ notes: 'x', meeting_link_status: 'zoom_pending_integration' });
    expect(noEvent).not.toHaveProperty('google_event_id');
  });

  it('records zoom_meeting_id / teams_meeting_id + host only when a real meeting was created (Task 70)', () => {
    const zoom = applyResolvedMeetingLink(
      {},
      { meetingLink: 'https://zoom.us/j/1', meetingMode: 'zoom', status: 'zoom', googleCalendarEventId: null, calendarEventHostUserId: 'u-1', zoomMeetingId: '111', teamsMeetingId: null }
    );
    expect(zoom).toEqual({ meeting_link_status: 'zoom', zoom_meeting_id: '111', calendar_event_host_user_id: 'u-1' });

    const teams = applyResolvedMeetingLink(
      {},
      { meetingLink: 'https://teams.microsoft.com/x', meetingMode: 'teams', status: 'teams', googleCalendarEventId: null, calendarEventHostUserId: 'u-2', zoomMeetingId: null, teamsMeetingId: 'MSP==' }
    );
    expect(teams).toEqual({ meeting_link_status: 'teams', teams_meeting_id: 'MSP==', calendar_event_host_user_id: 'u-2' });

    const fellBack = applyResolvedMeetingLink(
      {},
      { meetingLink: 'internal', meetingMode: 'internal_meet', status: 'zoom_unavailable', googleCalendarEventId: null, calendarEventHostUserId: null }
    );
    expect(fellBack).not.toHaveProperty('zoom_meeting_id');
  });
});

describe('meetingLinkNote', () => {
  it('zoom pending: distinct booker vs host copy, both honest about no link', () => {
    expect(meetingLinkNote('zoom_pending_integration', 'booker')).toMatch(/coming soon/i);
    expect(meetingLinkNote('zoom_pending_integration', 'host')).toMatch(/manually/i);
  });
  it('google pending connection: nudges the host, nothing shown to the booker', () => {
    expect(meetingLinkNote('google_meet_pending_connection', 'host')).toMatch(/Connect your Google Calendar/i);
    expect(meetingLinkNote('google_meet_pending_connection', 'booker')).toBeNull();
  });
  it('real link / internal / custom => no note', () => {
    expect(meetingLinkNote('google_meet', 'host')).toBeNull();
    expect(meetingLinkNote('internal', 'host')).toBeNull();
    expect(meetingLinkNote('none', 'booker')).toBeNull();
    expect(meetingLinkNote('zoom', 'host')).toBeNull();
    expect(meetingLinkNote('teams', 'host')).toBeNull();
  });

  it('zoom/teams pending connection => nudges the host, nothing to the booker (Task 70)', () => {
    expect(meetingLinkNote('zoom_pending_connection', 'host')).toMatch(/Connect your Zoom/i);
    expect(meetingLinkNote('zoom_pending_connection', 'booker')).toBeNull();
    expect(meetingLinkNote('teams_pending_connection', 'host')).toMatch(/Microsoft 365/i);
    expect(meetingLinkNote('teams_pending_connection', 'booker')).toBeNull();
  });
});
