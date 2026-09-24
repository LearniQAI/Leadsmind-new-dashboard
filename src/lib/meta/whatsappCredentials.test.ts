import { describe, it, expect } from 'vitest';
import { readWhatsAppCredentials } from './whatsappCredentials';

describe('readWhatsAppCredentials', () => {
  it('reads the canonical keys the Meta sign-in callback writes (every live connection)', () => {
    expect(readWhatsAppCredentials({ waba_id: '122730580915593', waba_name: 'Docs SA', phone_number: '+27 64 516 9790', phone_number_id: 'x' }))
      .toEqual({ wabaId: '122730580915593', businessName: 'Docs SA', phoneNumber: '+27 64 516 9790' });
  });

  it('falls back to the legacy keys the old manual/wizard connect paths wrote', () => {
    expect(readWhatsAppCredentials({ whatsapp_business_account_id: 'w1', whatsapp_business_name: 'Legacy', whatsapp_phone_number: '+1 555' }))
      .toEqual({ wabaId: 'w1', businessName: 'Legacy', phoneNumber: '+1 555' });
  });

  it('prefers the canonical key when both are present', () => {
    expect(readWhatsAppCredentials({ waba_id: 'new', whatsapp_business_account_id: 'old' }).wabaId).toBe('new');
  });

  it('never yields undefined, so a missing id can never build a //message_templates URL silently', () => {
    expect(readWhatsAppCredentials(null)).toEqual({ wabaId: '', businessName: '', phoneNumber: '' });
    expect(readWhatsAppCredentials({})).toEqual({ wabaId: '', businessName: '', phoneNumber: '' });
  });
});
