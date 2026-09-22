import { describe, it, expect, vi, beforeEach } from 'vitest';

// Batch 5 / H2: an invalid/unresolvable phone number must be skipped (never guessed at a
// country code), and a workspace/platform with no real Twilio number configured must be
// skipped (never routed to Twilio's public sandbox number) rather than attempting a send.

const state: {
  contacts: any[];
  workspaces: Record<string, any>;
  inserted: any[];
  updated: any[];
} = { contacts: [], workspaces: {}, inserted: [], updated: [] };

const sent: any[] = [];

function builder(table: string) {
  const ctx: any = { table, filters: {} };
  const b: any = {
    select: () => b,
    eq: (col: string, val: any) => { ctx.filters[col] = val; return b; },
    not: () => b,
    lte: () => b,
    insert: (row: any) => { state.inserted.push({ table, row }); return { then: (res: any) => Promise.resolve(res({ data: row, error: null })) }; },
    update: (row: any) => { state.updated.push({ table, row, id: ctx.filters.id }); return b; },
    single: async () => ({ data: state.workspaces[ctx.filters.id] || null, error: null }),
    then: (res: any) => Promise.resolve(res(resolve(ctx))),
  };
  return b;
}
function resolve(ctx: any) {
  if (ctx.table === 'contacts') return { data: state.contacts, error: null };
  return { data: null, error: null };
}

vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: (t: string) => builder(t) }) }));
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async (args: any) => { sent.push(args); }) }));
vi.mock('@/lib/twilio/resolveWorkspaceTwilioCredentials', () => ({ resolveWorkspaceTwilioCredentials: () => ({ accountSid: 'x', authToken: 'y' }) }));
vi.mock('jose', () => ({ SignJWT: class { setProtectedHeader() { return this; } setIssuedAt() { return this; } setExpirationTime() { return this; } async sign() { return 'token'; } } }));
vi.mock('@/shared/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { runReengagementLoop } from './reengagement-loop';

const OLD_ENV = process.env.TWILIO_PHONE_NUMBER;

beforeEach(() => {
  state.contacts = [];
  state.workspaces = {};
  state.inserted = [];
  state.updated = [];
  sent.length = 0;
  process.env.TWILIO_PHONE_NUMBER = OLD_ENV;
});

const contact = (over: any = {}) => ({
  id: 'c1', email: 'a@example.com', first_name: 'A', phone_e164: '+27821234567',
  workspace_id: 'ws1', last_login_at: new Date(Date.now() - 40 * 86400000).toISOString(),
  last_reengagement_sent_at: null, ...over,
});

describe('runReengagementLoop (Batch 5 / H2)', () => {
  it('sends to a contact with a valid phone_e164 and a workspace-configured number', async () => {
    state.contacts = [contact()];
    state.workspaces.ws1 = { id: 'ws1', name: 'Acme', twilio_number: '+15559990000' };
    const res = await runReengagementLoop();
    expect(res.sent).toBe(1);
    expect(res.skipped).toBe(0);
    expect(sent[0].to).toBe('whatsapp:+27821234567');
    expect(sent[0].config.fromNumber).toBe('whatsapp:+15559990000');
    expect(sent[0].workspaceId).toBe('ws1');
  });

  it('falls back to the real platform number when the workspace has none configured', async () => {
    process.env.TWILIO_PHONE_NUMBER = '+17372212163';
    state.contacts = [contact()];
    state.workspaces.ws1 = { id: 'ws1', name: 'Acme', twilio_number: null };
    const res = await runReengagementLoop();
    expect(res.sent).toBe(1);
    expect(sent[0].config.fromNumber).toBe('whatsapp:+17372212163');
  });

  it('skips (never sends from the Twilio sandbox number) when no real FROM number exists anywhere', async () => {
    delete process.env.TWILIO_PHONE_NUMBER;
    state.contacts = [contact()];
    state.workspaces.ws1 = { id: 'ws1', name: 'Acme', twilio_number: null };
    const res = await runReengagementLoop();
    expect(res.sent).toBe(0);
    expect(res.skipped).toBe(1);
    expect(sent).toHaveLength(0);
    // the literal sandbox number must never appear anywhere a send was attempted
    expect(JSON.stringify(sent)).not.toContain('14155238886');
  });

  it('a contact already rate-limited (sent within 30 days) is neither sent to nor skipped-and-logged', async () => {
    state.contacts = [contact({ last_reengagement_sent_at: new Date().toISOString() })];
    state.workspaces.ws1 = { id: 'ws1', twilio_number: '+15559990000' };
    const res = await runReengagementLoop();
    expect(res.sent).toBe(0);
    expect(res.skipped).toBe(0);
    expect(sent).toHaveLength(0);
  });
});
