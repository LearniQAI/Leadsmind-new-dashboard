import { describe, it, expect, vi, afterEach } from 'vitest';
import { subscribeWabaToMetaWebhook } from './subscribeWebhook';

vi.mock('@/shared/logger', () => ({ logger: { info: () => {}, error: () => {} } }));

const json = (body: any, status = 200) => ({ ok: status < 400, status, json: async () => body });

// Routes the three Graph calls the helper makes: GET /app, POST subscribed_apps, GET subscribed_apps.
function mockGraph(opts: { app?: any; post?: any; verify?: any }) {
  const calls: { url: string; method: string }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: any) => {
    const method = init?.method ?? 'GET';
    calls.push({ url, method });
    if (url.includes('/app?')) return opts.app ?? json({ id: '940149832353467' });
    if (method === 'POST') return opts.post ?? json({ success: true });
    return opts.verify ?? json({ data: [] });
  }));
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe('subscribeWabaToMetaWebhook', () => {
  it('succeeds only when the verify GET lists the token\'s own app (nested under whatsapp_business_api_data)', async () => {
    const calls = mockGraph({ verify: json({ data: [{ whatsapp_business_api_data: { id: '940149832353467', name: 'Leadsmind' } }] }) });
    expect(await subscribeWabaToMetaWebhook('122730580915593', 'tok')).toEqual({ success: true });
    expect(calls.map((c) => c.method)).toEqual(['GET', 'POST', 'GET']);
    expect(calls[1].url).toContain('/122730580915593/subscribed_apps');
  });

  it('does not trust success:true from the POST when the app is not actually listed', async () => {
    mockGraph({ verify: json({ data: [] }) });
    const r = await subscribeWabaToMetaWebhook('w', 'tok');
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/did not list this app/);
  });

  it('fails when a different app is listed', async () => {
    mockGraph({ verify: json({ data: [{ whatsapp_business_api_data: { id: '111' } }] }) });
    expect((await subscribeWabaToMetaWebhook('w', 'tok')).success).toBe(false);
  });

  it('surfaces a Graph error from the POST', async () => {
    mockGraph({ post: json({ error: { message: '(#200) Permissions error' } }, 403) });
    expect(await subscribeWabaToMetaWebhook('w', 'tok')).toEqual({ success: false, error: '(#200) Permissions error' });
  });

  it('fails without subscribing when the token\'s app cannot be resolved', async () => {
    const calls = mockGraph({ app: json({ error: { message: 'Invalid OAuth access token.' } }, 400) });
    expect(await subscribeWabaToMetaWebhook('w', 'bad')).toEqual({ success: false, error: 'Invalid OAuth access token.' });
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('returns a failure instead of throwing on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('socket hang up'); }));
    expect(await subscribeWabaToMetaWebhook('w', 'tok')).toEqual({ success: false, error: 'socket hang up' });
  });
});
