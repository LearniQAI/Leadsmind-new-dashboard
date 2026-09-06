import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { Webhook } from 'svix';

// Env must exist before the route module (which builds a Supabase admin client
// and reads RESEND_WEBHOOK_SECRET) is imported.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'service-role-test-key';
const SECRET = 'whsec_' + Buffer.from('resend-inbound-route-test-secret-0001').toString('base64');
process.env.RESEND_WEBHOOK_SECRET = SECRET;

const handleInboundWorkspaceEmail = vi.fn().mockResolvedValue(undefined);
const deadLetterResendEvent = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/email/inboundEmailProcessing', () => ({
  handleInboundWorkspaceEmail: (...a: any[]) => handleInboundWorkspaceEmail(...a),
  deadLetterResendEvent: (...a: any[]) => deadLetterResendEvent(...a),
  insertWebhookDeadLetter: vi.fn().mockResolvedValue(undefined),
  resolveInboundEmailContent: vi.fn().mockResolvedValue({ bodyText: '', rawText: '' }),
}));

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn() }));

// The route's module-level createClient(...) — only the dedup lookup is reached
// in these tests: .from('messages').select().eq().limit().maybeSingle().
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => {
      const node: any = {
        select: () => node,
        eq: () => node,
        limit: () => node,
        maybeSingle: async () => ({ data: null, error: null }),
      };
      return node;
    },
  }),
}));

import { POST } from './route';

const EVENT_1_WRAPPER = {
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

function signedRequest(bodyObj: any, secret = SECRET) {
  const raw = JSON.stringify(bodyObj);
  const wh = new Webhook(secret);
  const id = 'msg_3IwgEKHGmnj2LubcCvlg9Ooi8it';
  const ts = new Date();
  const signature = wh.sign(id, ts, raw);
  return new NextRequest('http://localhost/api/webhooks/resend/inbound', {
    method: 'POST',
    body: raw,
    headers: {
      'svix-id': id,
      'svix-timestamp': String(Math.floor(ts.getTime() / 1000)),
      'svix-signature': signature,
      'content-type': 'application/json',
    },
  });
}

describe('POST /api/webhooks/resend/inbound — svix 2.x verify()-returns-void regression', () => {
  beforeEach(() => {
    handleInboundWorkspaceEmail.mockClear().mockResolvedValue(undefined);
    deadLetterResendEvent.mockClear().mockResolvedValue(undefined);
  });

  it('a validly signed real "email.received" event returns 2xx (was: 500 TypeError reading \'type\')', async () => {
    const res = await POST(signedRequest(EVENT_1_WRAPPER));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ received: true });
    expect(handleInboundWorkspaceEmail).toHaveBeenCalledTimes(1);
    expect(handleInboundWorkspaceEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceSlug: 'zain-ul-hasssssan',
        messageId: '<CAEdX2dEh3Y_ZO=xJEPJhPhjrjK1nPr6hFYp=N8YKTBmu_L5t9A@mail.gmail.com>',
        from: 'zainulhassan5857@gmail.com',
      }),
    );
  });

  it('the response body never carries the old TypeError detail', async () => {
    const res = await POST(signedRequest(EVENT_1_WRAPPER));
    const body = await res.json();
    expect(JSON.stringify(body)).not.toMatch(/reading 'type'/);
    expect(res.status).not.toBe(500);
  });

  it('an invalid signature is dropped with 200 (not a 500), and processing is not attempted', async () => {
    const req = signedRequest(EVENT_1_WRAPPER);
    req.headers.set('svix-signature', 'v1,deadbeef');
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(handleInboundWorkspaceEmail).not.toHaveBeenCalled();
    expect(deadLetterResendEvent).toHaveBeenCalled();
  });
});
