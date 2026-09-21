import { describe, it, expect, vi, beforeEach } from 'vitest';

const send = vi.fn();
vi.mock('resend', () => ({ Resend: class { emails = { send: (...a: any[]) => send(...a) }; } }));

import { sendEmail, EmailSendError } from '@/lib/email';

const cfg = { apiKey: 're_live_key_123', fromEmail: 'a@acme.com' };
beforeEach(() => { send.mockReset(); });

describe('sendEmail error classification', () => {
  it('a provider rejection is a user-safe EmailSendError with the provider reason intact', async () => {
    send.mockResolvedValue({ data: null, error: { message: 'The to field must be a valid email address' } });
    const e: any = await sendEmail({ to: 'x', subject: 's', html: '<p/>', config: cfg }).catch((x) => x);
    expect(e).toBeInstanceOf(EmailSendError);
    expect(e.userSafe).toBe(true);
    expect(e.message).toBe('The to field must be a valid email address');
  });
  it('the missing-provider config guard is user-safe and its text is unchanged (callers match on it)', async () => {
    const e: any = await sendEmail({ to: 'x@y.co', subject: 's', html: '<p/>', config: { apiKey: undefined } }).catch((x) => x);
    expect(e.userSafe).toBe(true);
    expect(e.message).toMatch(/unavailable for this workspace/);
  });
  it('a transport/internal exception is NOT user-safe', async () => {
    send.mockImplementation(async () => { throw new TypeError('fetch failed: connect ECONNREFUSED 10.0.0.5:443'); });
    let caught: any;
    try { await sendEmail({ to: 'x@y.co', subject: 's', html: '<p/>', config: cfg }); } catch (e) { caught = e; }
    expect(caught).toBeDefined();
    expect(caught instanceof EmailSendError).toBe(false);
    expect(caught.userSafe).toBeUndefined();
  });
});
