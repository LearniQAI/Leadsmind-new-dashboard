import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/shared/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import { configureInboundSmsWebhook, inboundSmsWebhookUrl } from '@/lib/twilio/inboundWebhook';

const ORIGINAL = process.env.NEXT_PUBLIC_APP_URL;
afterEach(() => { process.env.NEXT_PUBLIC_APP_URL = ORIGINAL; });

function fakeTwilio(numbers: any[], failUpdate = false) {
  const updates: any[] = [];
  const client: any = (sid: string) => ({ update: async (p: any) => { if (failUpdate) throw new Error('twilio down'); updates.push({ sid, ...p }); return {}; } });
  client.incomingPhoneNumbers = Object.assign(client, { list: async () => numbers });
  return { client: Object.assign(client, { incomingPhoneNumbers: Object.assign((sid: string) => client(sid), { list: async () => numbers }) }), updates };
}

describe('inboundSmsWebhookUrl', () => {
  it('is the exact URL the inbound route rebuilds for signature validation, and only ever public https', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com/';
    expect(inboundSmsWebhookUrl()).toBe('https://app.example.com/api/webhooks/twilio/inbound');
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    expect(inboundSmsWebhookUrl()).toBeNull();
    process.env.NEXT_PUBLIC_APP_URL = 'http://app.example.com';
    expect(inboundSmsWebhookUrl()).toBeNull();
  });
});

describe('configureInboundSmsWebhook', () => {
  beforeEach(() => { process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'; });

  it('sets smsUrl (POST) on the matching number in the account', async () => {
    const { client, updates } = fakeTwilio([{ sid: 'PNother', phoneNumber: '+15550000000' }, { sid: 'PN1', phoneNumber: '+15005550001' }]);
    const r = await configureInboundSmsWebhook(client, '+15005550001');
    expect(r).toMatchObject({ ok: true, numberSid: 'PN1' });
    expect(updates).toEqual([{ sid: 'PN1', smsUrl: 'https://app.example.com/api/webhooks/twilio/inbound', smsMethod: 'POST' }]);
  });

  it('reports (never throws) when the number is not in the account, the URL is not public, or Twilio errors', async () => {
    expect(await configureInboundSmsWebhook(fakeTwilio([{ sid: 'PN1', phoneNumber: '+1999' }]).client, '+15005550001')).toMatchObject({ ok: false, reason: 'number_not_found_in_account' });
    expect(await configureInboundSmsWebhook(fakeTwilio([{ sid: 'PN1', phoneNumber: '+15005550001' }], true).client, '+15005550001')).toMatchObject({ ok: false, reason: 'twilio_error' });
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    expect(await configureInboundSmsWebhook(fakeTwilio([]).client, '+15005550001')).toMatchObject({ ok: false, reason: 'app_url_not_public' });
  });
});
