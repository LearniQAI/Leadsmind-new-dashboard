import { describe, it, expect } from 'vitest';
import { extractInboundToAddresses, extractInboundMessageId } from './inboundPayload';

// The exact payload captured from Resend event msg_3IwgEKHGmnj2LubcCvlg9Ooi8it
// (2026-09-06) that returned 500 on /api/webhooks/resend/inbound. The old code
// read only data.headers['Message-ID'] and data.id — this payload has NEITHER
// (no `headers` key, no `id`), only `message_id` and `email_id`.
const CAPTURED = {
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
};

describe('extractInboundMessageId — regression for the real 500 payload', () => {
  it('resolves a non-empty id from `message_id` on the exact captured payload', () => {
    expect(extractInboundMessageId(CAPTURED)).toBe(
      '<CAEdX2dEh3Y_ZO=xJEPJhPhjrjK1nPr6hFYp=N8YKTBmu_L5t9A@mail.gmail.com>',
    );
  });

  it('falls back to email_id when no message_id is present', () => {
    expect(extractInboundMessageId({ email_id: 'abc-123' })).toBe('abc-123');
  });

  it('still reads the legacy header + id shapes', () => {
    expect(extractInboundMessageId({ headers: { 'Message-ID': '<x@y>' } })).toBe('<x@y>');
    expect(extractInboundMessageId({ id: 'legacy-id' })).toBe('legacy-id');
  });

  it('returns "" only when the payload truly carries no identifier', () => {
    expect(extractInboundMessageId({ from: 'a@b.com', subject: 'hi' })).toBe('');
    expect(extractInboundMessageId({})).toBe('');
  });
});

describe('extractInboundToAddresses', () => {
  it('includes both `to` and `received_for` from the captured payload', () => {
    const addrs = extractInboundToAddresses(CAPTURED);
    expect(addrs).toContain('zain-ul-hasssssan@inbox.leadsmind.io');
  });

  it('reads received_for even when `to` is absent (forward / alias case)', () => {
    expect(extractInboundToAddresses({ received_for: ['slug@inbox.leadsmind.io'] })).toEqual([
      'slug@inbox.leadsmind.io',
    ]);
  });

  it('still merges the legacy Delivered-To / X-Forwarded-To headers', () => {
    const addrs = extractInboundToAddresses({
      to: 'a@x.com',
      headers: { 'Delivered-To': 'b@x.com', 'X-Forwarded-To': 'c@x.com' },
    });
    expect(addrs).toEqual(['a@x.com', 'b@x.com', 'c@x.com']);
  });

  it('handles a string (non-array) `to` and an empty payload', () => {
    expect(extractInboundToAddresses({ to: 'solo@x.com' })).toEqual(['solo@x.com']);
    expect(extractInboundToAddresses({})).toEqual([]);
  });
});
