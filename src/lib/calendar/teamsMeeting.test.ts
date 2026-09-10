import { describe, expect, it, vi, beforeEach } from 'vitest';

const getCalendarConnection = vi.fn();
const getFreshCalendarAccessToken = vi.fn();
vi.mock('@/lib/calendar/connections', () => ({
  getCalendarConnection: (...a: unknown[]) => getCalendarConnection(...a),
  getFreshCalendarAccessToken: (...a: unknown[]) => getFreshCalendarAccessToken(...a),
}));
vi.mock('@/shared/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { createTeamsMeeting, updateTeamsMeetingTime, deleteTeamsMeeting } from './teamsMeeting';

const times = { startIso: '2026-10-01T10:00:00.000Z', endIso: '2026-10-01T10:30:00.000Z' };
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  getCalendarConnection.mockReset().mockResolvedValue({ id: 'oc-1' });
  getFreshCalendarAccessToken.mockReset().mockResolvedValue('graph-access-token');
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

describe('createTeamsMeeting', () => {
  it('POSTs to Graph /me/onlineMeetings on the OUTLOOK connection and returns joinWebUrl + id', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'MSPmeeting==', joinWebUrl: 'https://teams.microsoft.com/l/meetup-join/abc' }) });
    const r = await createTeamsMeeting({ title: 'Sync', start_time: times.startIso, end_time: times.endIso }, 'host-1');
    expect(r).toEqual({ link: 'https://teams.microsoft.com/l/meetup-join/abc', meetingId: 'MSPmeeting==' });
    // reuses the Task 62 Outlook connection — NOT a separate teams provider
    expect(getCalendarConnection).toHaveBeenCalledWith('host-1', 'outlook');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://graph.microsoft.com/v1.0/me/onlineMeetings');
    expect(init.headers.Authorization).toBe('Bearer graph-access-token');
    expect(JSON.parse(init.body)).toMatchObject({ subject: 'Sync' });
  });

  it('no Outlook connection => nulls, no fetch', async () => {
    getCalendarConnection.mockResolvedValue(null);
    const r = await createTeamsMeeting({ title: 'Sync', start_time: times.startIso, end_time: times.endIso }, 'host-1');
    expect(r).toEqual({ link: null, meetingId: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Graph error (e.g. missing OnlineMeetings scope) => nulls, never throws', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: { code: 'Forbidden' } }) });
    const r = await createTeamsMeeting({ title: 'Sync', start_time: times.startIso, end_time: times.endIso }, 'host-1');
    expect(r).toEqual({ link: null, meetingId: null });
  });
});

describe('updateTeamsMeetingTime / deleteTeamsMeeting', () => {
  it('PATCH success => updated', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    expect(await updateTeamsMeetingTime('host-1', 'MSP==', times)).toBe('updated');
    expect(fetchMock.mock.calls[0][0]).toBe('https://graph.microsoft.com/v1.0/me/onlineMeetings/MSP%3D%3D');
  });

  it('no meeting id => not_applicable', async () => {
    expect(await updateTeamsMeetingTime('host-1', null, times)).toBe('not_applicable');
    expect(await deleteTeamsMeeting('host-1', null)).toBe('not_applicable');
  });

  it('connection gone but meeting exists => failed', async () => {
    getCalendarConnection.mockResolvedValue(null);
    expect(await updateTeamsMeetingTime('host-1', 'MSP==', times)).toBe('failed');
    expect(await deleteTeamsMeeting('host-1', 'MSP==')).toBe('failed');
  });

  it('DELETE treats 204/404 as done, other errors as failed', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    expect(await deleteTeamsMeeting('host-1', 'MSP==')).toBe('updated');
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    expect(await deleteTeamsMeeting('host-1', 'MSP==')).toBe('failed');
  });
});
