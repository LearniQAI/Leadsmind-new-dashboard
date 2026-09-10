import { describe, expect, it, vi, beforeEach } from 'vitest';

const sendWhatsApp = vi.fn();
const sendWhatsAppTemplate = vi.fn();
vi.mock('@/lib/meta/MetaAdapter', () => ({
  MetaAdapter: class {
    sendWhatsApp = (...a: unknown[]) => sendWhatsApp(...a);
    sendWhatsAppTemplate = (...a: unknown[]) => sendWhatsAppTemplate(...a);
  },
}));
vi.mock('@/shared/logger', () => ({ logger: { error: vi.fn(), info: vi.fn() } }));

import { sendWhatsAppAppointmentReminder } from './whatsappReminder';

const base = {
  credentials: { phone_number_id: '123', access_token_encrypted: 'x' },
  contact: { id: 'c1', first_name: 'Ann', phone: '+27820000001', opted_out: false, sms_opt_out: false },
  appointment: { id: 'a1', title: 'Consult', start_time: '2026-09-10T09:00:00.000Z' },
  smsBody: 'Reminder: "Consult" starts in 1 hour. Link: https://meet.google.com/x',
};

beforeEach(() => {
  sendWhatsApp.mockReset().mockResolvedValue({ success: true, externalId: 'wamid.1' });
  sendWhatsAppTemplate.mockReset().mockResolvedValue({ success: true, externalId: 'wamid.t1' });
});

describe('sendWhatsAppAppointmentReminder', () => {
  it('skips when the workspace has no WhatsApp connection', async () => {
    const r = await sendWhatsAppAppointmentReminder({ ...base, credentials: null });
    expect(r).toEqual({ status: 'skipped', reason: 'no_connection' });
    expect(sendWhatsApp).not.toHaveBeenCalled();
  });

  it('skips when the contact has no phone number', async () => {
    const r = await sendWhatsAppAppointmentReminder({ ...base, contact: { ...base.contact, phone: null } });
    expect(r).toEqual({ status: 'skipped', reason: 'no_number' });
  });

  it('skips an opted-out contact (opted_out OR sms_opt_out)', async () => {
    expect((await sendWhatsAppAppointmentReminder({ ...base, contact: { ...base.contact, opted_out: true } })).status).toBe('skipped');
    expect((await sendWhatsAppAppointmentReminder({ ...base, contact: { ...base.contact, sms_opt_out: true } })).status).toBe('skipped');
    expect(sendWhatsApp).not.toHaveBeenCalled();
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled();
  });

  it('inside the 24h window: sends the SMS body as free text', async () => {
    const r = await sendWhatsAppAppointmentReminder({ ...base, lastCustomerMessageAt: new Date(Date.now() - 60_000).toISOString() });
    expect(r).toEqual({ status: 'sent', usedTemplate: false, externalId: 'wamid.1' });
    expect(sendWhatsApp).toHaveBeenCalledWith('+27820000001', base.smsBody);
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled();
  });

  it('outside the window: sends the approved appointment_reminder template with [name, date, time]', async () => {
    const r = await sendWhatsAppAppointmentReminder({ ...base, lastCustomerMessageAt: null });
    expect(r.status).toBe('sent');
    expect((r as any).usedTemplate).toBe(true);
    const [to, name, lang, params] = sendWhatsAppTemplate.mock.calls[0];
    expect(to).toBe('+27820000001');
    expect(name).toBe('appointment_reminder');
    expect(lang).toBe('en_US');
    expect(params).toHaveLength(3);
    expect(params[0]).toBe('Ann');
  });

  it('normalises a bare phone number to +E.164', async () => {
    await sendWhatsAppAppointmentReminder({ ...base, contact: { ...base.contact, phone: '27820000001' }, lastCustomerMessageAt: null });
    expect(sendWhatsAppTemplate.mock.calls[0][0]).toBe('+27820000001');
  });

  it('returns failed (never throws) on a provider error', async () => {
    sendWhatsAppTemplate.mockResolvedValueOnce({ success: false, error: 're-engagement required' });
    const r = await sendWhatsAppAppointmentReminder({ ...base, lastCustomerMessageAt: null });
    expect(r).toEqual({ status: 'failed', error: 're-engagement required' });
  });

  it('returns failed (never throws) when the adapter throws', async () => {
    sendWhatsApp.mockRejectedValueOnce(new Error('network'));
    const r = await sendWhatsAppAppointmentReminder({ ...base, lastCustomerMessageAt: new Date().toISOString() });
    expect(r).toEqual({ status: 'failed', error: 'network' });
  });
});
