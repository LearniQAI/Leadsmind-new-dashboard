import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createHash } from 'crypto';

const sendEmail = vi.fn();
const logErr = vi.fn();
const state = { throwFromAdmin: null as Error | null, n: 0 };
const SENSITIVE = 'connect ECONNREFUSED 10.0.0.5:5432 password authentication failed for user "svc_admin"';

vi.mock('@/shared/logger', () => ({ logger: { error: (...a: any[]) => logErr(...a), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/email', async () => {
  const a: any = await vi.importActual('@/lib/email');
  return { ...a, sendEmail: (...x: any[]) => sendEmail(...x) };
});
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn() }));
vi.mock('next/headers', () => ({ headers: () => new Headers({ 'x-forwarded-for': `10.1.${state.n}.1` }) }));

const OWNER_COOKIE = 'owner-cookie-value';
function fakeClient() {
  return {
    from(table: string) {
      const rows: Record<string, any> = {
        contacts: [{ id: 'c1', email: 'x@y.co', phone: null }],
        forms: { name: 'Contact form', config: { recoveryEmailEnabled: true } },
        form_partial_submissions: { owner_token_hash: createHash('sha256').update(OWNER_COOKIE).digest('hex') },
      };
      const q: any = {
        select: () => q, eq: () => q, limit: () => q, insert: () => q, upsert: () => q,
        single: () => Promise.resolve({ data: rows[table] ?? null, error: null }),
        maybeSingle: () => Promise.resolve({ data: rows[table] ?? null, error: null }),
        then: (r: any) => r({ data: rows[table] ?? null, error: null }),
      };
      return q;
    },
  };
}
vi.mock('@supabase/supabase-js', () => ({ createClient: () => fakeClient() }));
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => { if (state.throwFromAdmin) throw state.throwFromAdmin; return fakeClient(); },
}));

process.env.JWT_SECRET = 'test-secret';

import { POST as magicLink } from '@/app/api/auth/portal/magic-link/route';
import { POST as studentLogin } from '@/app/api/auth/student/login/route';
import { POST as recoveryLink } from '@/app/api/public/forms/[id]/recovery-link/route';
import { EmailSendError } from '@/lib/email';

const post = (url: string, body: any, extra: Record<string, string> = {}) => {
  state.n++;
  return new NextRequest(url, { method: 'POST', body: JSON.stringify(body), headers: { 'x-forwarded-for': `10.2.${state.n}.1`, ...extra } });
};
const leaked = (v: unknown) => /ECONNREFUSED|svc_admin|10\.0\.0\.5|JWT_SECRET|FATAL/.test(JSON.stringify(v));
const PROVIDER = 'The to field must be a valid email address';

beforeEach(() => { sendEmail.mockReset(); logErr.mockReset(); state.throwFromAdmin = null; process.env.JWT_SECRET = 'test-secret'; });

describe.each([
  ['portal magic-link', (email: string) => magicLink(post('http://x/api/auth/portal/magic-link', { email, channel: 'email' }))],
  ['student login', (email: string) => studentLogin(post('http://x/api/auth/student/login', { email }))],
] as const)('%s', (_n, call) => {
  it('masks even a provider rejection (public endpoint: fixed generic message always), and logs it', async () => {
    const providerErr = new EmailSendError(PROVIDER);
    sendEmail.mockImplementation(async () => { throw providerErr; });
    const res = await call(`a${state.n}@y.co`);
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toBe('We could not send your sign-in link. Please try again.');
    expect(JSON.stringify(body)).not.toContain(PROVIDER);
    expect(logErr).toHaveBeenCalledWith(expect.objectContaining({ err: providerErr }), expect.stringMatching(/magic_link/));
  });
  it('masks an internal error, logs it, and never returns it', async () => {
    const internal = new Error(SENSITIVE);
    sendEmail.mockImplementation(async () => { throw internal; });
    const res = await call(`b${state.n}@y.co`);
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toBe('We could not send your sign-in link. Please try again.');
    expect(leaked(body)).toBe(false);
    expect(logErr).toHaveBeenCalledWith(expect.objectContaining({ err: internal }), expect.stringMatching(/magic_link/));
  });
});

describe('student login: config errors thrown inside the try block', () => {
  it('a missing JWT_SECRET no longer returns "[FATAL] JWT_SECRET is not configured" to anonymous callers', async () => {
    delete process.env.JWT_SECRET;
    const res = await studentLogin(post('http://x/api/auth/student/login', { email: 'c@y.co' }));
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(leaked(body)).toBe(false);
    expect(body.error).toBe('We could not send your sign-in link. Please try again.');
  });
});

describe('public form recovery-link', () => {
  const call = () =>
    recoveryLink(
      post('http://x/api/public/forms/f1/recovery-link', { email: 'v@y.co', sessionId: 's1' }, { cookie: `lm_partial_owner_f1=${OWNER_COOKIE}` }),
      { params: { id: 'f1' } },
    );

  it('inner path: masks even a provider rejection, and logs it', async () => {
    const providerErr = new EmailSendError(PROVIDER);
    sendEmail.mockImplementation(async () => { throw providerErr; });
    const res = await call();
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to send recovery email. Please try again.');
    expect(JSON.stringify(body)).not.toContain(PROVIDER);
    expect(logErr).toHaveBeenCalledWith(expect.objectContaining({ err: providerErr }), 'recovery_manager.send_recovery_email.failed');
  });
  it('inner path: masks an internal send error and logs it', async () => {
    const internal = new Error(SENSITIVE);
    sendEmail.mockImplementation(async () => { throw internal; });
    const res = await call();
    const body = await res.json();
    expect(body.error).toBe('Failed to send recovery email. Please try again.');
    expect(leaked(body)).toBe(false);
    expect(logErr).toHaveBeenCalledWith(expect.objectContaining({ err: internal }), 'recovery_manager.send_recovery_email.failed');
  });
  it('outer catch: masks an unexpected exception and logs it', async () => {
    const internal = new Error(SENSITIVE);
    state.throwFromAdmin = internal;
    const res = await call();
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toBe('Internal server error');
    expect(leaked(body)).toBe(false);
    expect(logErr).toHaveBeenCalledWith(expect.objectContaining({ err: internal }), 'recovery_link.unhandled');
  });
});
