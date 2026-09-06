import { describe, it, expect } from 'vitest';
import { Webhook } from 'svix';
import { verifyResendWebhookEvent } from './verifyResendWebhook';

// Regression for the SECOND production 500 on /api/webhooks/resend/inbound:
//   detail: "Cannot read properties of undefined (reading 'type')", code: null.
// svix ^1.94 -> ^2.2 (commit 742b29cb) made Webhook.verify() return void on
// success instead of the parsed body, so `const event = wh.verify(...)` was
// `undefined` and `event.type` threw. This helper must verify AND return the
// parsed body.

const SECRET = 'whsec_' + Buffer.from('resend-inbound-test-secret-key-0001').toString('base64');

function sign(rawBody: string, secret = SECRET) {
  const wh = new Webhook(secret);
  const id = 'msg_test_0001';
  const ts = new Date();
  const signature = wh.sign(id, ts, rawBody);
  return {
    'svix-id': id,
    'svix-timestamp': String(Math.floor(ts.getTime() / 1000)),
    'svix-signature': signature,
  };
}

// The exact wrapper Resend delivered for event msg_3IwgEKHGmnj2LubcCvlg9Ooi8it.
const EVENT_1 = {
  created_at: '2026-09-06T07:48:41.000Z',
  type: 'email.received',
  data: {
    attachments: [],
    bcc: [],
    cc: [],
    created_at: '2026-09-06T07:48:50.819Z',
    email_id: 'c5dfcddc-cb8d-4322-bacf-266f46a3c37e',
    from: 'zainulhassan5857@gmail.com',
    message_id: '<CAEdX2dEh3Y_ZO=xJEPJhPhjrjK1nPr6hFYp=N8YKTBmu_L5t9A@mail.gmail.com>',
    received_for: ['zain-ul-hasssssan@inbox.leadsmind.io'],
    subject: 'Re: New message from Zain Workspace',
    to: ['zain-ul-hasssssan@inbox.leadsmind.io'],
  },
};

describe('verifyResendWebhookEvent', () => {
  it('returns the PARSED body (not undefined) for a validly signed payload — the svix 2.x regression', () => {
    const raw = JSON.stringify(EVENT_1);
    const event = verifyResendWebhookEvent(raw, sign(raw), SECRET);
    expect(event).toBeTruthy();
    expect(event.type).toBe('email.received');
    expect(event.data.email_id).toBe('c5dfcddc-cb8d-4322-bacf-266f46a3c37e');
    expect(event.data.message_id).toContain('@mail.gmail.com');
  });

  it('reading `.type` on the result never throws (the exact crash we are fixing)', () => {
    const raw = JSON.stringify(EVENT_1);
    const event = verifyResendWebhookEvent(raw, sign(raw), SECRET);
    expect(() => event.type === 'email.received').not.toThrow();
  });

  it('throws on an invalid signature (security behaviour preserved)', () => {
    const raw = JSON.stringify(EVENT_1);
    const headers = sign(raw);
    headers['svix-signature'] = 'v1,not-a-real-signature';
    expect(() => verifyResendWebhookEvent(raw, headers, SECRET)).toThrow();
  });

  it('throws when the body is tampered with after signing', () => {
    const raw = JSON.stringify(EVENT_1);
    const headers = sign(raw);
    const tampered = raw.replace('email.received', 'email.delivered');
    expect(() => verifyResendWebhookEvent(tampered, headers, SECRET)).toThrow();
  });

  it('throws on missing svix headers', () => {
    const raw = JSON.stringify(EVENT_1);
    expect(() =>
      verifyResendWebhookEvent(raw, { 'svix-id': '', 'svix-timestamp': '', 'svix-signature': '' }, SECRET),
    ).toThrow();
  });

  it('returns {} for an authenticated empty body rather than throwing', () => {
    const event = verifyResendWebhookEvent('', sign(''), SECRET);
    expect(event).toEqual({});
  });
});
