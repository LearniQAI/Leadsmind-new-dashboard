import { describe, expect, it, vi, beforeEach } from 'vitest';

const getCalendarConnection = vi.fn();
const getFreshCalendarAccessToken = vi.fn();
vi.mock('@/lib/calendar/connections', () => ({
  getCalendarConnection: (...a: unknown[]) => getCalendarConnection(...a),
  getFreshCalendarAccessToken: (...a: unknown[]) => getFreshCalendarAccessToken(...a),
}));
vi.mock('@/shared/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { createZoomMeeting, updateZoomMeetingTime, deleteZoomMeeting } from './zoomMeeting';

const times = { startIso: '2026-10-01T10:00:00.000Z', endIso: '2026-10-01T10:45:00.000Z' };
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  getCalendarConnection.mockReset().mockResolvedValue({ id: 'zc-1' });
  getFreshCalendarAccessToken.mockReset().mockResolvedValue('zoom-access-token');
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

describe('createZoomMeeting', () => {
  it('POSTs a real scheduled meeting and returns join_url + id (as string)', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 87654321012, join_url: 'https://zoom.us/j/87654321012?pwd=a' }) });
    const r = await createZoomMeeting({ title: 'Call', start_time: times.startIso, end_time: times.endIso }, 'host-1');
    expect(r).toEqual({ link: 'https://zoom.us/j/87654321012?pwd=a', meetingId: '87654321012' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.zoom.us/v2/users/me/meetings');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer zoom-access-token');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ topic: 'Call', type: 2, duration: 45, timezone: 'UTC' });
  });

  it('no Zoom connection => nulls, no fetch (caller falls back)', async () => {
    getCalendarConnection.mockResolvedValue(null);
    const r = await createZoomMeeting({ title: 'Call', start_time: times.startIso, end_time: times.endIso }, 'host-1');
    expect(r).toEqual({ link: null, meetingId: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Zoom API error => nulls (never throws)', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });
    const r = await createZoomMeeting({ title: 'Call', start_time: times.startIso, end_time: times.endIso }, 'host-1');
    expect(r).toEqual({ link: null, meetingId: null });
  });
});

describe('updateZoomMeetingTime', () => {
  it('PATCHes /meetings/{id} and returns updated on 204', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 204, json: async () => ({}) });
    const r = await updateZoomMeetingTime('host-1', '999', times);
    expect(r).toBe('updated');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.zoom.us/v2/meetings/999');
    expect(fetchMock.mock.calls[0][1].method).toBe('PATCH');
  });

  it('no meeting id => not_applicable, no fetch', async () => {
    expect(await updateZoomMeetingTime('host-1', null, times)).toBe('not_applicable');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('connection gone (no token) but a meeting exists => failed (signal-worthy)', async () => {
    getCalendarConnection.mockResolvedValue(null);
    expect(await updateZoomMeetingTime('host-1', '999', times)).toBe('failed');
  });

  it('404 => not_applicable (meeting already gone)', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    expect(await updateZoomMeetingTime('host-1', '999', times)).toBe('not_applicable');
  });
});

describe('deleteZoomMeeting', () => {
  it('DELETEs and treats 204/404 as done', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 204 });
    expect(await deleteZoomMeeting('host-1', '999')).toBe('updated');
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    expect(await deleteZoomMeeting('host-1', '999')).toBe('updated');
  });

  it('real rejection => failed', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400 });
    expect(await deleteZoomMeeting('host-1', '999')).toBe('failed');
  });
});
