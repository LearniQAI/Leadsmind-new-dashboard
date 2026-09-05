import { describe, it, expect } from 'vitest';
import { withSmsConnectionStatus } from './smsConnectionStatus';

describe('withSmsConnectionStatus', () => {
  it('adds a disconnected sms row when the workspace has no twilio_number', () => {
    const rows = [{ platform: 'instagram', status: 'connected', last_sync_at: 'x' }];
    const result = withSmsConnectionStatus(rows, null);
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.platform === 'sms')).toMatchObject({ status: 'disconnected' });
  });

  it('adds a connected sms row when workspaces.twilio_number is set', () => {
    const result = withSmsConnectionStatus([], '+15551234567');
    expect(result).toEqual([{ platform: 'sms', status: 'connected', last_sync_at: null, credentials: {} }]);
  });

  it('is a no-op if a real sms row already exists (defensive)', () => {
    const rows = [{ platform: 'sms', status: 'connected', last_sync_at: 'already-here' }];
    const result = withSmsConnectionStatus(rows, null);
    expect(result).toEqual(rows);
    expect(result).toHaveLength(1);
  });

  it('never mutates the input array', () => {
    const rows = [{ platform: 'facebook', status: 'connected', last_sync_at: 'x' }];
    const copy = [...rows];
    withSmsConnectionStatus(rows, '+1555');
    expect(rows).toEqual(copy);
  });
});
