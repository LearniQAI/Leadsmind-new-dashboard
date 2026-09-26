// Live verification: Gmail mailbox connection (provider='gmail' in user_calendar_connections).
// Real database, real /api/auth/gmail/callback route handler, real CSRF nonce table, real AES-256-GCM
// encryption, real store/refresh/revoke/status code. ONLY Google's HTTP endpoints are faked (token
// exchange/refresh, Gmail profile, revoke, Calendar freeBusy): a real consent screen needs a browser.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { randomUUID, randomBytes } from 'crypto';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';

const runId = randomUUID().slice(0, 8);
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.modify';
const CAL_SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly openid';
const MAILBOX = `person-${runId}@gmail.test`;

let db: any, ws = '', userId = '';
const userIds: string[] = [];
let conn: typeof import('@/lib/calendar/connections');
let gmail: typeof import('@/lib/gmail/connection');
let encryption: typeof import('@/lib/encryption');
let callback: (req: Request) => Promise<Response>;

// ---- Fake Google, real everything else ---------------------------------------------------------
const realFetch = globalThis.fetch;
type Call = { url: string; body: string; auth: string | null };
let calls: Call[] = [];
let google = {
  grantedScope: `${GMAIL_SCOPE} openid https://www.googleapis.com/auth/userinfo.email ${CAL_SCOPES}`,
  accessToken: 'gmail-access-1',
  refreshToken: 'gmail-refresh-1',
  refreshFails: false,
  profileStatus: 200,
};

function fakeFetch(input: any, init?: any): Promise<Response> {
  const url = typeof input === 'string' ? input : input.url;
  const isGoogle = /googleapis\.com|accounts\.google\.com/.test(url);
  if (!isGoogle) return realFetch(input, init);
  const body = init?.body ? String(init.body) : '';
  const auth = (init?.headers && (init.headers.Authorization || init.headers.authorization)) || null;
  calls.push({ url, body, auth });
  const json = (status: number, obj: any) => Promise.resolve(new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } }));

  if (url.startsWith('https://oauth2.googleapis.com/token')) {
    const p = new URLSearchParams(body);
    if (p.get('grant_type') === 'authorization_code') {
      return json(200, { access_token: google.accessToken, refresh_token: google.refreshToken, expires_in: 3599, scope: google.grantedScope, token_type: 'Bearer' });
    }
    if (google.refreshFails) return json(400, { error: 'invalid_grant', error_description: 'Token has been expired or revoked.' });
    return json(200, { access_token: `${google.accessToken}-refreshed`, expires_in: 3599, scope: google.grantedScope });
  }
  if (url.startsWith('https://gmail.googleapis.com/gmail/v1/users/me/profile')) {
    if (google.profileStatus !== 200) return json(google.profileStatus, { error: { code: google.profileStatus } });
    return json(200, { emailAddress: MAILBOX, messagesTotal: 1, threadsTotal: 1, historyId: '1' });
  }
  if (url.startsWith('https://oauth2.googleapis.com/revoke')) return Promise.resolve(new Response('', { status: 200 }));
  if (url.includes('/calendar/v3/freeBusy')) return json(200, { calendars: { primary: { busy: [] } } });
  return json(404, { error: 'unexpected google url in test' });
}

// ---- helpers -----------------------------------------------------------------------------------
async function newNonce(): Promise<string> {
  const nonce = randomBytes(32).toString('hex');
  const { error } = await db.from('oauth_state_nonces').insert({
    nonce, user_id: userId, workspace_id: ws, platform: 'gmail', extra: {}, expires_at: new Date(Date.now() + 600_000).toISOString(),
  });
  if (error) throw new Error(`nonce: ${error.message}`);
  return nonce;
}
async function runCallback(): Promise<URL> {
  const state = await newNonce();
  const res = await callback(new Request(`http://localhost:3000/api/auth/gmail/callback?code=auth-code-${runId}&state=${state}`));
  return new URL(res.headers.get('location')!);
}
const rowOf = async (provider: string) =>
  (await db.from('user_calendar_connections').select('*').eq('workspace_id', ws).eq('user_id', userId).eq('provider', provider).maybeSingle()).data;
const integration = async (provider: string) =>
  (await db.from('workspace_integrations').select('connected, account_label, needs_reconnect').eq('workspace_id', ws).eq('provider', provider).maybeSingle()).data;
const revokeCalls = () => calls.filter((c) => c.url.startsWith('https://oauth2.googleapis.com/revoke'));

let calendarSnapshot: any;

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  db = (await import('@/lib/supabase/server')).createAdminClient();
  const swept = await sweepStaleTestWorkspaces(db, testRunPatterns('gml'));
  if (swept) console.warn(`[cleanup] removed ${swept} stale workspace(s) left by earlier runs of this test`);

  const { data, error } = await db.auth.admin.createUser({ email: `gml-${runId}-a-owner@example.com`, password: randomUUID(), email_confirm: true });
  if (error) throw new Error(`createUser: ${error.message}`);
  userId = data.user.id;
  userIds.push(userId);
  await new Promise((r) => setTimeout(r, 800));
  ws = (await db.from('workspace_members').select('workspace_id').eq('user_id', userId).single()).data.workspace_id;

  vi.stubGlobal('fetch', fakeFetch);
  conn = await import('@/lib/calendar/connections');
  gmail = await import('@/lib/gmail/connection');
  encryption = await import('@/lib/encryption');
  callback = (await import('@/app/api/auth/gmail/callback/route')).GET;

  // The same user's EXISTING Google Calendar connection, same Google account.
  await conn.storeCalendarConnection({
    workspaceId: ws, userId, provider: 'google', accessToken: 'calendar-access', refreshToken: 'calendar-refresh',
    expiresAt: Date.now() + 3_600_000, email: MAILBOX, scope: CAL_SCOPES,
  });
  calendarSnapshot = await rowOf('google');
});

afterEach(() => { calls = []; });
afterAll(async () => {
  vi.unstubAllGlobals();
  await deleteTestWorkspaces(db, [ws], userIds);
});

const expectCalendarUntouched = async () => {
  const cal = await rowOf('google');
  expect(cal.status).toBe('connected');
  expect(cal.credentials).toEqual(calendarSnapshot.credentials);
  expect(cal.updated_at).toBe(calendarSnapshot.updated_at);
};

describe('connect', () => {
  it('rejects a consent where the Gmail permission was unticked: no row stored', async () => {
    google.grantedScope = `openid https://www.googleapis.com/auth/userinfo.email ${CAL_SCOPES}`;
    const loc = await runCallback();
    expect(loc.searchParams.get('gmail_error')).toBe('missing_permission');
    expect(await rowOf('gmail')).toBeNull();
    google.grantedScope = `${GMAIL_SCOPE} openid https://www.googleapis.com/auth/userinfo.email ${CAL_SCOPES}`;
  });

  it('a replayed nonce is refused', async () => {
    const state = await newNonce();
    await db.from('oauth_state_nonces').update({ used_at: new Date().toISOString() }).eq('nonce', state);
    const res = await callback(new Request(`http://localhost:3000/api/auth/gmail/callback?code=x&state=${state}`));
    expect(new URL(res.headers.get('location')!).searchParams.get('gmail_error')).toBe('invalid_state');
  });

  it('stores a separate provider=gmail row, tokens encrypted (AES-GCM), mailbox address from Gmail', async () => {
    const loc = await runCallback();
    expect(loc.pathname).toBe('/settings/integrations-hub');
    expect(loc.searchParams.get('gmail_connected')).toBe('1');

    const row = await rowOf('gmail');
    expect(row).toMatchObject({ provider: 'gmail', status: 'connected', user_id: userId });
    const raw = JSON.stringify(row.credentials);
    expect(raw).not.toContain('gmail-access-1');
    expect(raw).not.toContain('gmail-refresh-1');
    expect(row.credentials.access_token_encrypted).toMatch(/^gcm1:/);
    expect(row.credentials.refresh_token_encrypted).toMatch(/^gcm1:/);
    expect(encryption.decrypt(row.credentials.access_token_encrypted)).toBe('gmail-access-1');
    expect(encryption.decrypt(row.credentials.refresh_token_encrypted)).toBe('gmail-refresh-1');
    expect(row.credentials.email).toBe(MAILBOX);
    expect(conn.hasGmailScope(row.credentials.scope)).toBe(true);

    // Two rows for the user now, the calendar one byte-for-byte unchanged.
    expect((await db.from('user_calendar_connections').select('provider').eq('user_id', userId)).data.map((r: any) => r.provider).sort()).toEqual(['gmail', 'google']);
    await expectCalendarUntouched();
  });

  it('status is verified live and shows the connected address; workspace row agrees', async () => {
    expect(await gmail.getGmailConnectionStatus(ws, userId)).toEqual({ state: 'connected', email: MAILBOX });
    expect(calls.some((c) => c.url.includes('/gmail/v1/users/me/profile') && c.auth === 'Bearer gmail-access-1')).toBe(true);
    expect(await integration('Gmail')).toMatchObject({ connected: true, account_label: MAILBOX, needs_reconnect: false });
  });

  it('calendar busy-sync never touches the Gmail row', async () => {
    const start = new Date(); const end = new Date(Date.now() + 86_400_000);
    await (await import('@/lib/calendar/calendarSync')).getExternalBusySlots(userId, start.toISOString(), end.toISOString());
    expect(calls.some((c) => c.url.includes('freeBusy') && c.auth === 'Bearer calendar-access')).toBe(true);
    expect(calls.some((c) => (c.auth || '').includes('gmail-access') || c.url.startsWith('https://oauth2.googleapis.com/token'))).toBe(false);
    expect((await rowOf('gmail')).status).toBe('connected');
  });
});

describe('revoked / expired authorization', () => {
  it('a refresh Google rejects (invalid_grant) -> needs reconnect, workspace row flagged, calendar untouched', async () => {
    const row = await rowOf('gmail');
    await db.from('user_calendar_connections').update({ credentials: { ...row.credentials, expires_at: Date.now() - 1000 } }).eq('id', row.id);
    google.refreshFails = true;

    expect(await gmail.getGmailConnectionStatus(ws, userId)).toEqual({ state: 'needs_reconnect', email: MAILBOX, reason: 'authorization_revoked' });
    expect((await rowOf('gmail')).status).toBe('error');
    expect(await integration('Gmail')).toMatchObject({ connected: false, needs_reconnect: true });
    await expectCalendarUntouched();
    google.refreshFails = false;
  });

  it('a token Gmail answers 401 for -> needs reconnect', async () => {
    google.accessToken = 'gmail-access-2';
    await runCallback();
    google.profileStatus = 401;
    expect((await gmail.getGmailConnectionStatus(ws, userId)).state).toBe('needs_reconnect');
    expect((await rowOf('gmail')).status).toBe('error');
    google.profileStatus = 200;
  });

  it('reconnect restores it in place (same row, new encrypted token)', async () => {
    const before = await rowOf('gmail');
    google.accessToken = 'gmail-access-3';
    expect((await runCallback()).searchParams.get('gmail_connected')).toBe('1');
    const after = await rowOf('gmail');
    expect(after.id).toBe(before.id);
    expect(after.status).toBe('connected');
    expect(encryption.decrypt(after.credentials.access_token_encrypted)).toBe('gmail-access-3');
    expect(await gmail.getGmailConnectionStatus(ws, userId)).toEqual({ state: 'connected', email: MAILBOX });
    expect(await integration('Gmail')).toMatchObject({ connected: true, needs_reconnect: false });
    await expectCalendarUntouched();
  });
});

describe('disconnect never breaks the other Google connection', () => {
  it('disconnecting Gmail removes only the Gmail row and does NOT call Google revoke (shared grant)', async () => {
    await conn.deleteCalendarConnection(ws, userId, 'gmail');
    expect(await rowOf('gmail')).toBeNull();
    expect(revokeCalls()).toHaveLength(0);
    expect(await gmail.getGmailConnectionStatus(ws, userId)).toEqual({ state: 'not_connected' });
    expect(await integration('Gmail')).toMatchObject({ connected: false, needs_reconnect: false });
    await expectCalendarUntouched();
    expect(await integration('Google Calendar')).toMatchObject({ connected: true });
  });

  it('disconnecting Calendar leaves Gmail connected and does NOT call Google revoke', async () => {
    google.accessToken = 'gmail-access-4';
    await runCallback();
    await conn.deleteCalendarConnection(ws, userId, 'google');
    expect(await rowOf('google')).toBeNull();
    expect(revokeCalls()).toHaveLength(0);
    expect((await rowOf('gmail')).status).toBe('connected');
    expect(await gmail.getGmailConnectionStatus(ws, userId)).toEqual({ state: 'connected', email: MAILBOX });
  });

  it('with no other Google connection left, disconnecting Gmail DOES revoke at Google', async () => {
    await conn.deleteCalendarConnection(ws, userId, 'gmail');
    const revokes = revokeCalls();
    expect(revokes).toHaveLength(1);
    expect(new URLSearchParams(revokes[0].body).get('token')).toBe('gmail-refresh-1');
    expect(await rowOf('gmail')).toBeNull();
  });
});
