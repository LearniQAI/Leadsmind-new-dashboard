import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// inboundEmailProcessing.ts constructs a Supabase admin client at module load
// time. A chainable stub — enough for both resolveInboundEmailContent (no DB)
// and handleInboundWorkspaceEmail (workspace lookup + message insert).
const dbState = vi.hoisted(() => ({
  workspace: { id: 'ws-1' } as any,
  messageInsert: { error: null } as any,
  inserts: [] as any[],
  deadLetters: [] as any[],
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      const node: any = {
        _table: table,
        select: () => node,
        eq: () => node,
        limit: () => node,
        maybeSingle: async () => ({ data: table === 'workspaces' ? dbState.workspace : null, error: null }),
        single: async () => ({ data: table === 'workspaces' ? dbState.workspace : null, error: null }),
        insert: async (payload: any) => {
          if (table === 'webhook_dead_letters') {
            dbState.deadLetters.push(payload);
            return { error: null };
          }
          dbState.inserts.push({ table, payload });
          return dbState.messageInsert;
        },
      };
      return node;
    },
  }),
}));

vi.mock('./contactConversation', () => ({
  findOrCreateContactByEmail: async () => ({ id: 'contact-1' }),
  findOrCreateEmailConversation: async () => ({ id: 'conv-1', isNew: false }),
}));

import { resolveInboundEmailContent, handleInboundWorkspaceEmail } from './inboundEmailProcessing';

// The exact payload from Resend event msg_3IwgEKHGmnj2LubcCvlg9Ooi8it (the 500).
const CAPTURED = {
  attachments: [], bcc: [], cc: [],
  created_at: '2026-09-06T07:48:50.819Z',
  email_id: 'c5dfcddc-cb8d-4322-bacf-266f46a3c37e',
  from: 'zainulhassan5857@gmail.com',
  message_id: '<CAEdX2dEh3Y_ZO=xJEPJhPhjrjK1nPr6hFYp=N8YKTBmu_L5t9A@mail.gmail.com>',
  received_for: ['zain-ul-hasssssan@inbox.leadsmind.io'],
  subject: 'Re: New message from Zain Workspace',
  to: ['zain-ul-hasssssan@inbox.leadsmind.io'],
};

describe('resolveInboundEmailContent — shared by the Email->SMS bridge and the email-channel path', () => {
  const realFetch = global.fetch;
  beforeEach(() => { global.fetch = vi.fn() as any; });
  afterEach(() => { global.fetch = realFetch; vi.restoreAllMocks(); });

  it('prefers the Resend receiving-API text body over the webhook payload fields', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ text: 'Hello from the receiving API', html: '<p>ignored</p>' }) });
    const { bodyText, rawText } = await resolveInboundEmailContent({ email_id: 'em_123', subject: 'Quick question', text: 'ignored webhook text' });
    expect(bodyText).toBe('Hello from the receiving API');
    expect(rawText).toBe('Subj: Quick question\n\nHello from the receiving API');
  });

  it('falls back to the webhook payload text when the receiving API fails', async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 404, text: async () => 'not found' });
    const { rawText } = await resolveInboundEmailContent({ email_id: 'em_x', subject: 'Hi', text: 'Plain text body' });
    expect(rawText).toBe('Subj: Hi\n\nPlain text body');
  });

  it('falls back to stripped HTML when there is no plain text anywhere', async () => {
    const { bodyText } = await resolveInboundEmailContent({ html: '<p>Hello <b>world</b></p>' });
    expect(bodyText).toBe('Hello world');
  });

  it('strips Gmail-style quoted replies', async () => {
    const { bodyText } = await resolveInboundEmailContent({ text: 'My actual reply.\n\nOn Mon, Sep 1, 2026 at 10:00 AM Jane wrote:\n> original message' });
    expect(bodyText).toBe('My actual reply.');
  });

  it('strips Outlook-style quoted headers', async () => {
    const { bodyText } = await resolveInboundEmailContent({ text: 'My reply text\n\nFrom: sender@x.com\nSent: Monday\nTo: me@x.com\nSubject: Re: Hi' });
    expect(bodyText).toBe('My reply text');
  });

  it('produces an empty rawText when there is truly nothing to show', async () => {
    expect((await resolveInboundEmailContent({})).rawText).toBe('');
  });

  it('subject-only email (no body) still produces a rawText', async () => {
    expect((await resolveInboundEmailContent({ subject: 'No body here' })).rawText).toBe('Subj: No body here');
  });
});

describe('handleInboundWorkspaceEmail — regression for the real 500 payload', () => {
  const realFetch = global.fetch;
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ text: 'hy' }) }) as any;
    dbState.workspace = { id: 'ws-1' };
    dbState.messageInsert = { error: null };
    dbState.inserts = [];
    dbState.deadLetters = [];
  });
  afterEach(() => { global.fetch = realFetch; vi.restoreAllMocks(); });

  it('processes the exact captured payload without throwing, and inserts a threaded inbound message', async () => {
    await expect(
      handleInboundWorkspaceEmail({
        emailData: CAPTURED,
        from: CAPTURED.from,
        messageId: CAPTURED.message_id, // route now extracts this correctly
        workspaceSlug: 'zain-ul-hasssssan',
      }),
    ).resolves.toBeUndefined();

    const msg = dbState.inserts.find((i) => i.table === 'messages');
    expect(msg).toBeTruthy();
    expect(msg.payload).toMatchObject({
      direction: 'inbound',
      status: 'delivered',
      sender_handle: 'zainulhassan5857@gmail.com',
      subject: 'Re: New message from Zain Workspace',
    });
    expect(msg.payload.content).toContain('hy'); // real reply body, from the receiving-API fetch
    expect(msg.payload.bridge_metadata.resend_message_id).toBe(CAPTURED.message_id);
    expect(dbState.deadLetters).toHaveLength(0);
  });

  it('a duplicate-insert (23505) is swallowed, not thrown — Resend gets a 2xx', async () => {
    dbState.messageInsert = { error: { code: '23505', message: 'duplicate key' } };
    await expect(
      handleInboundWorkspaceEmail({ emailData: CAPTURED, from: CAPTURED.from, messageId: CAPTURED.message_id, workspaceSlug: 'zain-ul-hasssssan' }),
    ).resolves.toBeUndefined();
  });

  it('a real DB error (e.g. missing column) still throws — with the code visible to the route catch', async () => {
    dbState.messageInsert = { error: { code: '42703', message: 'column "subject" does not exist' } };
    await expect(
      handleInboundWorkspaceEmail({ emailData: CAPTURED, from: CAPTURED.from, messageId: CAPTURED.message_id, workspaceSlug: 'zain-ul-hasssssan' }),
    ).rejects.toMatchObject({ code: '42703' });
  });

  it('unknown workspace slug -> dead-letters, does not throw', async () => {
    dbState.workspace = null;
    await expect(
      handleInboundWorkspaceEmail({ emailData: CAPTURED, from: CAPTURED.from, messageId: CAPTURED.message_id, workspaceSlug: 'nope' }),
    ).resolves.toBeUndefined();
    expect(dbState.deadLetters.length).toBeGreaterThan(0);
  });
});
