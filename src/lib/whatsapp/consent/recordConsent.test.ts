import { describe, it, expect, vi } from 'vitest';

vi.mock('@/shared/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => { throw new Error('admin client must not be used when a db is injected'); } }));

import { recordWhatsAppConsent, mapRecordConsentCode, type RecordConsentInput } from './recordConsent';

const input: RecordConsentInput = {
  workspaceId: 'ws', contactId: 'c1', phone: '082 555 0101', status: 'ACTIVE', sourceType: 'whatsapp_optin_form',
  consentText: 'I agree to receive WhatsApp marketing from ACME.', consentTextVersion: '1.0',
  consentedAt: new Date('2026-10-03T10:42:18Z'),
};
const rpcReturning = (data: unknown, error: unknown = null) => ({ calls: [] as any[], rpc(fn: string, args: any) { (this as any).calls.push({ fn, args }); return Promise.resolve({ data, error }); } });

describe('mapRecordConsentCode', () => {
  it('maps every success code', () => {
    for (const c of ['created', 'activated', 'already_active', 'already_pending']) expect(mapRecordConsentCode(c)).toEqual({ ok: true, code: c });
  });
  it('maps every refusal code to ok:false', () => {
    for (const c of ['previously_opted_out', 'invalid_phone', 'invalid_contact', 'invalid_input']) expect(mapRecordConsentCode(c)).toEqual({ ok: false, code: c });
  });
  it('anything unknown is an error, never a success', () => {
    for (const c of [null, undefined, '', 'ok', 'CREATED', 42, {}, 'created ']) expect(mapRecordConsentCode(c)).toEqual({ ok: false, code: 'error' });
  });
});

describe('recordWhatsAppConsent', () => {
  it('calls wa_record_consent with every field mapped and the date as ISO', async () => {
    const db = rpcReturning('created');
    expect(await recordWhatsAppConsent(input, { db })).toEqual({ ok: true, code: 'created' });
    expect(db.calls[0].fn).toBe('wa_record_consent');
    expect(db.calls[0].args).toMatchObject({
      p_workspace: 'ws', p_contact_id: 'c1', p_phone_e164: '082 555 0101', p_status: 'ACTIVE', p_source_type: 'whatsapp_optin_form',
      p_consent_text_version: '1.0', p_consented_at: '2026-10-03T10:42:18.000Z', p_source_id: null, p_ip_hash: null, p_actor: null,
    });
  });

  it('a previously opted-out number is a refusal', async () => {
    expect(await recordWhatsAppConsent(input, { db: rpcReturning('previously_opted_out') })).toEqual({ ok: false, code: 'previously_opted_out' });
  });

  it('a second call reports already_active as ok', async () => {
    expect(await recordWhatsAppConsent(input, { db: rpcReturning('already_active') })).toEqual({ ok: true, code: 'already_active' });
  });

  it('FAILS CLOSED on a database error, a thrown error and an unexpected value', async () => {
    expect(await recordWhatsAppConsent(input, { db: rpcReturning(null, { message: 'permission denied' }) })).toEqual({ ok: false, code: 'error' });
    expect(await recordWhatsAppConsent(input, { db: { rpc: () => { throw new Error('fetch failed'); } } as any })).toEqual({ ok: false, code: 'error' });
    expect(await recordWhatsAppConsent(input, { db: rpcReturning('something_new') })).toEqual({ ok: false, code: 'error' });
  });
});
