// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWorkspaceIntegrations } from './useWorkspaceIntegrations';

// Root-cause regression test for "click Disconnect, nothing happens, no error
// shown": the hook used to await window.fetch() for the DELETE/POST call and
// then unconditionally refetch, without ever checking res.ok — a real server
// failure (403 from requireWorkspaceRole, a thrown error inside
// deleteCalendarConnection, etc.) would resolve as a normal fetch() response,
// get silently ignored, and the immediate refetch would just re-display the
// unchanged state. disconnect()/connect() must now reject with the server's
// real error message on a non-2xx response instead of swallowing it.
describe('useWorkspaceIntegrations — disconnect/connect error surfacing', () => {
  const jsonResponse = (body: any, ok: boolean) => ({
    ok,
    json: async () => body,
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('disconnect() throws the server error message on a failed DELETE and does not silently succeed', async () => {
    const fetchMock = vi.fn()
      // initial GET on mount
      .mockResolvedValueOnce(jsonResponse({ integrations: [{ provider: 'Google Calendar', category: 'email_calendar', connected: true, account_label: 'a@b.com', connected_at: null, needs_reconnect: false }] }, true))
      // DELETE fails
      .mockResolvedValueOnce(jsonResponse({ error: 'You are not a member of the active workspace' }, false));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useWorkspaceIntegrations('ws-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(async () => {
        await result.current.disconnect('Google Calendar');
      })
    ).rejects.toThrow('You are not a member of the active workspace');

    // Only the initial GET happened — the failed DELETE must NOT trigger a
    // refetch that silently re-confirms "still connected" with no error.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('disconnect() resolves and refetches integrations on a successful DELETE', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ integrations: [{ provider: 'Google Calendar', category: 'email_calendar', connected: true, account_label: 'a@b.com', connected_at: null, needs_reconnect: false }] }, true))
      .mockResolvedValueOnce(jsonResponse({ success: true }, true))
      .mockResolvedValueOnce(jsonResponse({ integrations: [{ provider: 'Google Calendar', category: 'email_calendar', connected: false, account_label: null, connected_at: null, needs_reconnect: false }] }, true));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useWorkspaceIntegrations('ws-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.disconnect('Google Calendar');
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.current.isConnected('Google Calendar')).toBe(false);
  });

  it('isPending is true only for the provider currently being disconnected, and clears after', async () => {
    let resolveDelete: (v: any) => void;
    const deletePromise = new Promise(res => { resolveDelete = res; });

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ integrations: [] }, true))
      .mockImplementationOnce(() => deletePromise)
      .mockResolvedValueOnce(jsonResponse({ integrations: [] }, true));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useWorkspaceIntegrations('ws-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let disconnectPromise: Promise<void>;
    act(() => {
      disconnectPromise = result.current.disconnect('Zoom');
    });

    await waitFor(() => expect(result.current.isPending('Zoom')).toBe(true));
    expect(result.current.isPending('Google Calendar')).toBe(false);

    await act(async () => {
      resolveDelete(jsonResponse({ success: true }, true));
      await disconnectPromise;
    });

    expect(result.current.isPending('Zoom')).toBe(false);
  });
});
