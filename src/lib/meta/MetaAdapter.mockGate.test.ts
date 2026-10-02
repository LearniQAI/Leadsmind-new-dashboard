import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/encryption', () => ({ decrypt: (v: string) => v, encrypt: (v: string) => v }));

import { MetaAdapter } from './MetaAdapter';
import { isMetaMockMode, isMockValue, MOCK_CREDENTIALS_REJECTED } from './mockMode';

const WA_MOCK = { phone_number_id: 'mock_pn_1', access_token_encrypted: 'tok' };
const FB_MOCK = { page_id: 'mock_page_1', page_access_token_encrypted: 'tok' };
const IG_MOCK = { instagram_id: 'mock_ig_1', page_access_token_encrypted: 'tok' };
const WA_REAL_NO_TOKEN = { phone_number_id: '1055550000000000', access_token_encrypted: '' };

const sendAll = (c: any) => [
  new MetaAdapter(c).sendWhatsApp('+15550100001', 'hi'),
  new MetaAdapter(c).sendWhatsAppTemplate('+15550100001', 'tpl', 'en_US', []),
  new MetaAdapter(c).sendFacebook('psid', 'hi'),
  new MetaAdapter(c).sendInstagram('igsid', 'hi'),
];

describe('mock mode gate', () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it('is off by default', () => {
    vi.stubEnv('META_MOCK_MODE', '');
    expect(isMetaMockMode()).toBe(false);
  });
  it('is on only with META_MOCK_MODE=true outside production', () => {
    vi.stubEnv('META_MOCK_MODE', 'true'); vi.stubEnv('NODE_ENV', 'test');
    expect(isMetaMockMode()).toBe(true);
  });
  it('can never be on in production, whatever the env says', () => {
    vi.stubEnv('META_MOCK_MODE', 'true'); vi.stubEnv('NODE_ENV', 'production');
    expect(isMetaMockMode()).toBe(false);
  });
  it('isMockValue recognises mock_ prefixes only', () => {
    expect(isMockValue('mock_x')).toBe(true);
    expect(isMockValue('1055550000')).toBe(false);
    expect(isMockValue(undefined)).toBe(false);
  });
});

describe('MetaAdapter credential gate', () => {
  const realFetch = global.fetch;
  beforeEach(() => { global.fetch = vi.fn() as any; });
  afterEach(() => { global.fetch = realFetch; vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it('production: a mock_ id is rejected on every send path (never a success) and makes no network call', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('META_MOCK_MODE', 'true');
    const wa = await Promise.all([...sendAll(WA_MOCK).slice(0, 2)]);
    const fb = await new MetaAdapter(FB_MOCK).sendFacebook('psid', 'hi');
    const ig = await new MetaAdapter(IG_MOCK).sendInstagram('igsid', 'hi');
    for (const r of [...wa, fb, ig]) {
      expect(r.success).toBe(false);
      expect(r.error).toBe(MOCK_CREDENTIALS_REJECTED);
      expect(r.errorType).toBe('mock_credentials_rejected');
      expect(r.externalId).toBeUndefined();
    }
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('non-production without META_MOCK_MODE: a mock_ id is rejected too', async () => {
    vi.stubEnv('NODE_ENV', 'development'); vi.stubEnv('META_MOCK_MODE', '');
    const r = await new MetaAdapter(WA_MOCK).sendWhatsApp('+15550100001', 'hi');
    expect(r.success).toBe(false);
    expect(r.errorType).toBe('mock_credentials_rejected');
  });

  it('explicit mock mode (non-production): a mock_ id returns a mock id and makes no network call', async () => {
    vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('META_MOCK_MODE', 'true');
    const [wa, tpl, fb, ig] = await Promise.all([
      new MetaAdapter(WA_MOCK).sendWhatsApp('+15550100001', 'hi'),
      new MetaAdapter(WA_MOCK).sendWhatsAppTemplate('+15550100001', 't', 'en_US', []),
      new MetaAdapter(FB_MOCK).sendFacebook('psid', 'hi'),
      new MetaAdapter(IG_MOCK).sendInstagram('igsid', 'hi'),
    ]);
    expect(wa.externalId).toMatch(/^mock_wa_out_/);
    expect(tpl.externalId).toMatch(/^mock_wa_template_out_/);
    expect(fb.externalId).toMatch(/^mock_fb_out_/);
    expect(ig.externalId).toMatch(/^mock_ig_out_/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each(['production', 'test'])('a MISSING token is a failure, never a success (NODE_ENV=%s, mock mode on)', async (env) => {
    vi.stubEnv('NODE_ENV', env); vi.stubEnv('META_MOCK_MODE', 'true');
    const results = await Promise.all([
      new MetaAdapter(WA_REAL_NO_TOKEN).sendWhatsApp('+15550100001', 'hi'),
      new MetaAdapter(WA_REAL_NO_TOKEN).sendWhatsAppTemplate('+15550100001', 't', 'en_US', []),
      new MetaAdapter({ page_id: '9000', page_access_token_encrypted: '' }).sendFacebook('psid', 'hi'),
      new MetaAdapter({ instagram_id: '1784', page_access_token_encrypted: '' }).sendInstagram('igsid', 'hi'),
      new MetaAdapter({ phone_number_id: 'mock_pn', access_token_encrypted: '' }).sendWhatsApp('+15550100001', 'hi'),
    ]);
    for (const r of results) { expect(r.success).toBe(false); expect(r.errorType).toBe('missing_token'); }
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('a real id with a token still reaches the Graph API', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    (global.fetch as any).mockResolvedValue({ ok: true, status: 200, json: async () => ({ messages: [{ id: 'wamid.X' }] }) });
    const r = await new MetaAdapter({ phone_number_id: '1055550000000000', access_token_encrypted: 'tok' }).sendWhatsApp('+15550100001', 'hi');
    expect(r).toEqual({ success: true, externalId: 'wamid.X' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
