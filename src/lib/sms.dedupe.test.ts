import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/shared/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({}) }));

const h = vi.hoisted(() => ({
  existing: [] as any[],
  listError: null as any,
  created: [] as any[],
  listed: [] as any[],
}));
// A fake Twilio client: messages.list returns what a test put in `existing`; messages.create records the request.
vi.mock('twilio', () => ({
  default: () => ({
    messages: {
      list: async (args: any) => { h.listed.push(args); if (h.listError) throw h.listError; return h.existing; },
      create: async (opts: any) => { h.created.push(opts); return { sid: 'SM_NEW' }; },
    },
  }),
}));

import { sendSMS, findEarlierIdenticalMessage } from '@/lib/sms';

const CONFIG = { accountSid: 'AC1', authToken: 'tok', fromNumber: '+15005550001' };
const T0 = '2026-09-21T10:00:00.000Z';
const at = (offsetMs: number) => new Date(new Date(T0).getTime() + offsetMs).toISOString();

beforeEach(() => { h.existing = []; h.listError = null; h.created = []; h.listed = []; });

describe('findEarlierIdenticalMessage', () => {
  const find = (existing: any[]) => { h.existing = existing; return findEarlierIdenticalMessage({ messages: { list: async () => existing } }, { to: '+27821234567', from: '+15005550001', body: 'Hi Ada', since: T0 }); };

  it('finds an identical message created since the first attempt began', async () => {
    expect(await find([{ sid: 'SM1', body: 'Hi Ada', dateCreated: at(5_000), status: 'queued' }])).toBe('SM1');
  });
  it('ignores a different body, an older message, and one Twilio itself failed or cancelled', async () => {
    expect(await find([{ sid: 'a', body: 'Something else', dateCreated: at(5_000), status: 'sent' }])).toBeNull();
    expect(await find([{ sid: 'b', body: 'Hi Ada', dateCreated: at(-10 * 60_000), status: 'delivered' }])).toBeNull();
    expect(await find([{ sid: 'c', body: 'Hi Ada', dateCreated: at(5_000), status: 'failed' }])).toBeNull();
    expect(await find([{ sid: 'd', body: 'Hi Ada', dateCreated: at(5_000), status: 'canceled' }])).toBeNull();
  });
  it('tolerates a little clock skew (30s before the recorded start still counts)', async () => {
    expect(await find([{ sid: 'e', body: 'Hi Ada', dateCreated: at(-30_000), status: 'sent' }])).toBe('e');
  });
});

describe('sendSMS duplicate-send protection (Twilio has no idempotency key for messages)', () => {
  it('a re-attempt ADOPTS the message that already exists and does NOT send a second one', async () => {
    h.existing = [{ sid: 'SM_PRIOR', body: 'Hi Ada', dateCreated: at(2_000), status: 'sent' }];
    const r = await sendSMS({ to: '+27821234567', message: 'Hi Ada', config: CONFIG, purpose: 'transactional', dedupeSince: T0 });
    expect(r).toEqual({ sid: 'SM_PRIOR', reconciled: true });
    expect(h.created).toHaveLength(0);
    expect(h.listed[0]).toMatchObject({ to: '+27821234567', from: '+15005550001' });
  });

  it('a re-attempt with nothing found sends normally (and asks for delivery receipts when given a callback)', async () => {
    const r = await sendSMS({ to: '+27821234567', message: 'Hi Ada', config: CONFIG, purpose: 'transactional', dedupeSince: T0, statusCallback: 'https://app.test/api/webhooks/twilio/sms-status' });
    expect(r).toEqual({ sid: 'SM_NEW', reconciled: false });
    expect(h.created).toHaveLength(1);
    expect(h.created[0]).toMatchObject({ body: 'Hi Ada', to: '+27821234567', from: '+15005550001', statusCallback: 'https://app.test/api/webhooks/twilio/sms-status' });
  });

  it('a first attempt never pays for the lookup', async () => {
    await sendSMS({ to: '+27821234567', message: 'Hi Ada', config: CONFIG, purpose: 'transactional' });
    expect(h.listed).toHaveLength(0);
    expect(h.created).toHaveLength(1);
  });

  it('FAILS CLOSED: if the lookup errors the message is NOT sent (retry later rather than risk a duplicate)', async () => {
    h.listError = new Error('Twilio 503');
    await expect(sendSMS({ to: '+27821234567', message: 'Hi Ada', config: CONFIG, purpose: 'transactional', dedupeSince: T0 })).rejects.toThrow('Twilio 503');
    expect(h.created).toHaveLength(0);
  });

  it('matches WhatsApp-prefixed recipients and senders as given', async () => {
    h.existing = [{ sid: 'SM_WA', body: 'Hello', dateCreated: at(1_000), status: 'sent' }];
    const r = await sendSMS({ to: 'whatsapp:+27821234567', message: 'Hello', config: { ...CONFIG, fromNumber: 'whatsapp:+15005550001' }, purpose: 'transactional', dedupeSince: T0 });
    expect(r.sid).toBe('SM_WA');
    expect(h.listed[0]).toMatchObject({ to: 'whatsapp:+27821234567', from: 'whatsapp:+15005550001' });
  });
});
