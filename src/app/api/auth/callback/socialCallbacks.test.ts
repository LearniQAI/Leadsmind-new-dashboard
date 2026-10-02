import net from 'net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Secrets that must NEVER appear in a redirect URL, a log line, an Inngest payload or a
// request_timings row.
const CODE = 'AUTHCODE_s3cr3t_9f8e';
const CLIENT_SECRET = 'CLIENT_SECRET_zz81';
const ACCESS_TOKEN = 'ACCESS_TOKEN_tok_77aa';
const PAGE_TOKEN = 'PAGE_TOKEN_pg_55bb';
const SECRETS = [CODE, CLIENT_SECRET, ACCESS_TOKEN, PAGE_TOKEN];

const logged: unknown[] = [];
const timingRows: unknown[] = [];
const upserts: any[] = [];
const sends: any[] = [];

vi.mock('@/shared/logger', () => {
  const capture = (level: string) => (...args: unknown[]) => { logged.push({ level, args }); };
  return { logger: { info: capture('info'), warn: capture('warn'), error: capture('error') }, safeLog: (fn: () => void) => fn() };
});
vi.mock('@vercel/functions', () => ({ waitUntil: (p: Promise<unknown>) => { void p; } }));
vi.mock('@/lib/encryption', () => ({ encrypt: (v: string) => `enc(${v.length})`, decrypt: (v: string) => v }));
vi.mock('@/lib/oauth/stateNonce', () => ({
  consumeOAuthStateNonce: async (nonce: string | null) => {
    if (nonce !== 'good-nonce') { const e: any = new Error('bad state'); e.name = 'ForbiddenError'; throw e; }
    return { userId: 'u1', workspaceId: 'ws-1', extra: { platform: 'facebook', returnTo: 'social' } };
  },
}));
vi.mock('@/lib/meta/subscribeWebhook', () => ({ subscribePageToMetaWebhook: async () => ({ success: true }) }));
vi.mock('@/lib/inngest', () => ({ inngest: { send: async (e: unknown) => { sends.push(e); } } }));

const chain = () => ({
  from: (table: string) => ({
    upsert: async (row: unknown) => { upserts.push({ table, row }); return { error: null }; },
    insert: async (row: unknown) => { timingRows.push(row); return { error: null }; },
  }),
});
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => chain() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => chain() }));

let blackholePort = 0;
let server: net.Server;
const sockets = new Set<net.Socket>();
const realFetch = globalThis.fetch;

// 'blackhole' sends every provider call to a TCP server that accepts and never answers — the
// shape of the production hang. Otherwise provider calls get canned responses.
let mode: 'blackhole' | 'ok' | 'provider500';

function stubFetch() {
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = String(input);
    if (mode === 'blackhole') {
      return realFetch(`http://127.0.0.1:${blackholePort}/x`, init);
    }
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
    if (mode === 'provider500') {
      // A provider error body that echoes credentials back — must not reach logs or URLs.
      return json({ error: `bad request code=${CODE} secret=${CLIENT_SECRET} token=${ACCESS_TOKEN}` }, 500);
    }
    if (url.includes('linkedin.com/oauth')) return json({ access_token: ACCESS_TOKEN, expires_in: 3600 });
    if (url.includes('api.linkedin.com')) return json({ sub: 'li-1', name: 'Test Person' });
    if (url.includes('tiktokapis.com/v2/oauth')) return json({ access_token: ACCESS_TOKEN, open_id: 'tt-open-id-1', expires_in: 3600 });
    if (url.includes('tiktokapis.com/v2/user/info')) return json({ data: { user: { display_name: 'Tester' } } });
    if (url.includes('oauth/access_token')) return json({ access_token: ACCESS_TOKEN });
    if (url.includes('me/accounts')) return json({ data: [{ id: 'pg-1', name: 'Test Page', access_token: PAGE_TOKEN }] });
    return json({});
  }) as typeof fetch;
}

beforeAll(async () => {
  server = net.createServer((s) => { sockets.add(s); s.on('close', () => sockets.delete(s)); s.on('error', () => {}); });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  blackholePort = (server.address() as net.AddressInfo).port;
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.test';
  process.env.META_APP_ID = 'meta-app';
  process.env.META_APP_SECRET = CLIENT_SECRET;
  process.env.LINKEDIN_CLIENT_ID = 'li-client';
  process.env.LINKEDIN_CLIENT_SECRET = CLIENT_SECRET;
  process.env.TIKTOK_CLIENT_KEY = 'tt-key';
  process.env.TIKTOK_CLIENT_SECRET = CLIENT_SECRET;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc';
  stubFetch();
});

afterAll(() => {
  globalThis.fetch = realFetch;
  sockets.forEach((s) => s.destroy());
  server.close();
});

beforeEach(() => {
  logged.length = 0;
  timingRows.length = 0;
  upserts.length = 0;
  sends.length = 0;
  mode = 'ok';
});

const ROUTES = {
  linkedin: () => import('./linkedin/route'),
  tiktok: () => import('./tiktok/route'),
  meta: () => import('../meta/callback/route'),
} as const;

function callbackUrl(provider: keyof typeof ROUTES, qs: Record<string, string>) {
  return `https://app.test/api/auth/${provider === 'meta' ? 'meta' : 'callback/' + provider}/callback?${new URLSearchParams(qs)}`;
}

async function run(provider: keyof typeof ROUTES, qs: Record<string, string>) {
  const { GET } = await ROUTES[provider]();
  const started = Date.now();
  const res = await GET(new Request(callbackUrl(provider, qs)));
  return { res, ms: Date.now() - started, location: res.headers.get('location') ?? '' };
}

function expectNoSecretsAnywhere(location: string) {
  const haystack = JSON.stringify({ logged, timingRows, sends, location });
  for (const s of SECRETS) expect(haystack).not.toContain(s);
}

describe.each(['linkedin', 'tiktok', 'meta'] as const)('%s callback', (provider) => {
  const platformParam = provider === 'meta' ? 'facebook' : provider;

  it('blackholed provider: bounded failure (timeout), never a hang', async () => {
    mode = 'blackhole';
    const { location, ms } = await run(provider, { code: CODE, state: 'good-nonce' });
    expect(ms).toBeLessThan(25_000);
    expect(location).toContain('/social/connections');
    expect(location).toContain(`platform=${platformParam}`);
    expect(location).toContain('error=timeout');
    expectNoSecretsAnywhere(location);
    // request_timings completion was recorded for this failure
    expect(JSON.stringify(logged)).toContain('api.request.completed');
  }, 40_000);

  it('user denied / cancelled: access_denied, no provider call', async () => {
    mode = 'blackhole'; // would hang if the route tried to contact the provider
    const { location, ms } = await run(provider, { error: 'access_denied', state: 'good-nonce' });
    expect(ms).toBeLessThan(2_000);
    expect(location).toContain('error=access_denied');
    expectNoSecretsAnywhere(location);
  });

  it('provider error body echoing credentials: generic failure, nothing leaked', async () => {
    mode = 'provider500';
    const { location } = await run(provider, { code: CODE, state: 'good-nonce' });
    expect(location).toContain('error=provider_error');
    expectNoSecretsAnywhere(location);
  });

  it('invalid state is rejected before any provider call', async () => {
    mode = 'blackhole';
    const { location, ms } = await run(provider, { code: CODE, state: 'forged' });
    expect(ms).toBeLessThan(2_000);
    expect(location).toContain('error=invalid_state');
  });

  it('success: connected redirect, tokens only stored encrypted, nothing logged', async () => {
    const { location } = await run(provider, { code: CODE, state: 'good-nonce' });
    expect(location).toContain('success=1');
    expect(upserts.length).toBeGreaterThan(0);
    expect(JSON.stringify(upserts)).not.toContain(ACCESS_TOKEN);
    expectNoSecretsAnywhere(location);
  });
});

describe('meta callback specifics', () => {
  it('only saves Facebook inline and defers Instagram/WhatsApp discovery with an id-only payload', async () => {
    await run('meta', { code: CODE, state: 'good-nonce' });
    expect(upserts.map((u) => u.row.platform)).toEqual(['facebook']);
    expect(upserts[0].row.credentials.page_name).toBe('Test Page');
    expect(sends).toHaveLength(1);
    expect(sends[0].name).toBe('meta/discover');
    expect(JSON.stringify(sends[0])).not.toMatch(/token/i);
  });
});
