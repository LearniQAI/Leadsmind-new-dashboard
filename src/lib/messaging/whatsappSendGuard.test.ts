import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/smsOptOut', () => ({ getSmsOptOutReason: vi.fn() }));

import { getSmsOptOutReason } from '@/lib/smsOptOut';
import {
  checkWhatsAppSendAllowed,
  WHATSAPP_WINDOW_CLOSED_MESSAGE,
  WHATSAPP_OPTED_OUT_MESSAGE,
  WHATSAPP_INVALID_NUMBER_MESSAGE,
  CONVERSATION_NOT_FOUND_MESSAGE,
} from './whatsappSendGuard';

const reason = getSmsOptOutReason as unknown as ReturnType<typeof vi.fn>;
const HOUR = 3600_000;

/** A minimal chainable stand-in for the supabase client: conversations select, then messages select. */
function fakeDb(conv: any, lastInboundMessage: string | null = null) {
  const q = (result: any) => {
    const chain: any = {};
    for (const m of ['select', 'eq', 'order', 'limit']) chain[m] = () => chain;
    chain.maybeSingle = async () => ({ data: result });
    return chain;
  };
  return { from: (t: string) => (t === 'conversations' ? q(conv) : q(lastInboundMessage ? { sent_at: lastInboundMessage } : null)) };
}
const waConv = (over: any = {}) => ({
  platform: 'whatsapp', external_thread_id: '+27825550101',
  last_customer_message_at: new Date(Date.now() - 2 * HOUR).toISOString(),
  contacts: { phone: '082 555 0101', opted_out: false, sms_opt_out: false }, ...over,
});

describe('checkWhatsAppSendAllowed', () => {
  it('allows an in-window send to a contact who has not opted out', async () => {
    reason.mockResolvedValue(null);
    expect(await checkWhatsAppSendAllowed(fakeDb(waConv()), 'ws', 'c1')).toBeNull();
  });

  it('other channels pass through without any opt-out lookup', async () => {
    reason.mockClear();
    for (const platform of ['email', 'sms', 'facebook', 'instagram']) {
      expect(await checkWhatsAppSendAllowed(fakeDb(waConv({ platform })), 'ws', 'c1')).toBeNull();
    }
    expect(reason).not.toHaveBeenCalled();
  });

  it('BLOCKS when the conversation is not found in this workspace (never allow an unverifiable send)', async () => {
    reason.mockClear();
    const r = await checkWhatsAppSendAllowed(fakeDb(null), 'ws', 'foreign-or-unknown');
    expect(r).toEqual({ error: CONVERSATION_NOT_FOUND_MESSAGE, code: 'conversation_not_found' });
    expect(reason).not.toHaveBeenCalled();
  });

  it('blocks a contact flagged opted_out', async () => {
    const r = await checkWhatsAppSendAllowed(fakeDb(waConv({ contacts: { phone: '+27825550101', opted_out: true } })), 'ws', 'c1');
    expect(r).toEqual({ error: WHATSAPP_OPTED_OUT_MESSAGE, code: 'opted_out' });
  });
  it('blocks a contact flagged sms_opt_out (opt-out is unified)', async () => {
    const r = await checkWhatsAppSendAllowed(fakeDb(waConv({ contacts: { phone: '+27825550101', sms_opt_out: true } })), 'ws', 'c1');
    expect(r?.code).toBe('opted_out');
  });
  it('blocks a number on the durable suppression list even when the contact flags are clear', async () => {
    reason.mockResolvedValue('suppression_list');
    const r = await checkWhatsAppSendAllowed(fakeDb(waConv()), 'ws', 'c1');
    expect(r).toEqual({ error: WHATSAPP_OPTED_OUT_MESSAGE, code: 'opted_out' });
  });
  it('blocks an invalid number with its own message', async () => {
    reason.mockResolvedValue('invalid_number');
    const r = await checkWhatsAppSendAllowed(fakeDb(waConv()), 'ws', 'c1');
    expect(r).toEqual({ error: WHATSAPP_INVALID_NUMBER_MESSAGE, code: 'invalid_number' });
  });
  it('fails CLOSED when the opt-out lookup errors', async () => {
    reason.mockRejectedValue(new Error('db down'));
    const r = await checkWhatsAppSendAllowed(fakeDb(waConv()), 'ws', 'c1');
    expect(r?.code).toBe('opt_out_check_failed');
  });
  it('opt-out wins over a closed window', async () => {
    const r = await checkWhatsAppSendAllowed(fakeDb(waConv({ last_customer_message_at: null, contacts: { opted_out: true } })), 'ws', 'c1');
    expect(r?.code).toBe('opted_out');
  });

  it('blocks free text outside the 24h window with the typed error', async () => {
    reason.mockResolvedValue(null);
    const r = await checkWhatsAppSendAllowed(fakeDb(waConv({ last_customer_message_at: new Date(Date.now() - 25 * HOUR).toISOString() })), 'ws', 'c1');
    expect(r).toEqual({ error: WHATSAPP_WINDOW_CLOSED_MESSAGE, code: 'window_closed' });
  });
  it('blocks when the contact never wrote in', async () => {
    reason.mockResolvedValue(null);
    expect((await checkWhatsAppSendAllowed(fakeDb(waConv({ last_customer_message_at: null })), 'ws', 'c1'))?.code).toBe('window_closed');
  });
  it('falls back to the newest inbound message when the conversation clock is empty', async () => {
    reason.mockResolvedValue(null);
    const recent = new Date(Date.now() - 3 * HOUR).toISOString();
    expect(await checkWhatsAppSendAllowed(fakeDb(waConv({ last_customer_message_at: null }), recent), 'ws', 'c1')).toBeNull();
    const old = new Date(Date.now() - 48 * HOUR).toISOString();
    expect((await checkWhatsAppSendAllowed(fakeDb(waConv({ last_customer_message_at: null }), old), 'ws', 'c1'))?.code).toBe('window_closed');
  });
  it('the window message says template replies are coming soon', () => {
    expect(WHATSAPP_WINDOW_CLOSED_MESSAGE).toBe('Outside the 24-hour window. Template replies are coming soon.');
  });
});
