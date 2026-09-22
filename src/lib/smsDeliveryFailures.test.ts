import { describe, it, expect } from 'vitest';
import { isDestinationSoftFailCode, recordSmsSoftFail, resetSmsSoftFailStreak } from '@/lib/smsDeliveryFailures';

describe('isDestinationSoftFailCode', () => {
  it('counts the codes that are shaped like "this destination number cannot receive SMS"', () => {
    for (const code of ['30003', '30004', '30005', '30006']) {
      expect(isDestinationSoftFailCode(code)).toBe(true);
    }
  });

  it('does NOT count sender/account issues or message-content filtering (verified against Twilio\'s own docs before building)', () => {
    // 30001 queue overflow, 30002 account suspended: about the SENDER, not the destination number.
    // 30007 carrier/content filtering: Twilio's own docs say a DIFFERENT message could still succeed.
    // 30008/30009: not a statement about the destination number either.
    for (const code of ['30001', '30002', '30007', '30008', '30009']) {
      expect(isDestinationSoftFailCode(code)).toBe(false);
    }
  });

  it('never counts the opt-out code (21610) — that is a consent signal handled on its own path', () => {
    expect(isDestinationSoftFailCode('21610')).toBe(false);
  });

  it('handles missing/empty/whitespace input without throwing', () => {
    expect(isDestinationSoftFailCode(null)).toBe(false);
    expect(isDestinationSoftFailCode(undefined)).toBe(false);
    expect(isDestinationSoftFailCode('')).toBe(false);
    expect(isDestinationSoftFailCode(' 30005 ')).toBe(true);
  });
});

describe('recordSmsSoftFail / resetSmsSoftFailStreak (thin RPC wrappers)', () => {
  const fakeSupabase = (data: any, error: any = null) => ({ rpc: async (_fn: string, _args: any) => ({ data, error }) });

  it('calls record_sms_soft_fail with the right arguments and returns its outcome', async () => {
    let captured: any;
    const db = { rpc: async (fn: string, args: any) => { captured = { fn, args }; return { data: { flagged: true, total: 5, consecutive: 3 }, error: null }; } };
    const r = await recordSmsSoftFail(db, { workspaceId: 'w1', contactId: 'c1', phoneE164: '+27821234567', errorCode: '30005', messageSid: 'SM1' });
    expect(captured.fn).toBe('record_sms_soft_fail');
    expect(captured.args).toEqual({ p_workspace_id: 'w1', p_contact_id: 'c1', p_phone_e164: '+27821234567', p_error_code: '30005', p_message_sid: 'SM1' });
    expect(r).toEqual({ flagged: true, total: 5, consecutive: 3 });
  });

  it('reports NOT flagged when the RPC says so, and defaults booleans sanely', async () => {
    const r = await recordSmsSoftFail(fakeSupabase({ flagged: false, total: 1, consecutive: 1 }), { workspaceId: 'w1', contactId: 'c1', phoneE164: null, errorCode: '30003', messageSid: 'SM2' });
    expect(r.flagged).toBe(false);
  });

  it('a lookup/RPC error propagates (fail closed: caller decides, never silently succeeds)', async () => {
    await expect(recordSmsSoftFail(fakeSupabase(null, { message: 'boom' }), { workspaceId: 'w1', contactId: 'c1', phoneE164: null, errorCode: '30003', messageSid: 'SM3' }))
      .rejects.toThrow('record_sms_soft_fail failed');
  });

  it('resetSmsSoftFailStreak calls the reset RPC with the contact id', async () => {
    let captured: any;
    const db = { rpc: async (fn: string, args: any) => { captured = { fn, args }; return { data: null, error: null }; } };
    await resetSmsSoftFailStreak(db, 'c1');
    expect(captured).toEqual({ fn: 'reset_sms_soft_fail_streak', args: { p_contact_id: 'c1' } });
  });

  it('resetSmsSoftFailStreak also propagates errors', async () => {
    await expect(resetSmsSoftFailStreak(fakeSupabase(null, { message: 'boom' }), 'c1')).rejects.toThrow('reset_sms_soft_fail_streak failed');
  });
});
