// Live verification: email data model on messages (migration 20260930000008).
// Real database, real Supabase Auth sessions for the RLS checks, throwaway workspaces.
// Covers: Message-ID duplicate detection (true duplicate caught, different emails never collide),
// per-mailbox provider-id dedup, per-workspace external_id, the same-workspace mailbox FK, mailbox
// provenance across disconnect/reconnect, and attachments.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const runId = randomUUID().slice(0, 8);

let db: any;
let store: typeof import('@/lib/email/emailMessageStore');
let gmail: typeof import('@/lib/gmail/connection');
let conn: typeof import('@/lib/calendar/connections');
const userIds: string[] = [];
const wsIds: string[] = [];

type U = { id: string; client: any; ws: string };
// alice (owner) + bob (member with the Communication module) + nomod (member without it) share a
// workspace; other is a different tenant.
let alice: U, bob: U, nomod: U, other: U;
let convA = '', convB = '', mailboxAlice = '', mailboxBob = '', otherMailbox = '';

async function mkUser(tag: string): Promise<U> {
  const email = `emm-${runId}-${tag}-owner@example.com`;
  const password = randomUUID();
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`createUser: ${error.message}`);
  userIds.push(data.user.id);
  await new Promise((r) => setTimeout(r, 800));
  const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`signIn: ${signInError.message}`);
  const ws = (await db.from('workspace_members').select('workspace_id').eq('user_id', data.user.id).single()).data.workspace_id;
  wsIds.push(ws);
  return { id: data.user.id, client, ws };
}

async function connectGmail(ws: string, userId: string, address: string): Promise<string> {
  await conn.storeCalendarConnection({
    workspaceId: ws, userId, provider: 'gmail', accessToken: `at-${address}`, refreshToken: `rt-${address}`,
    expiresAt: Date.now() + 3_600_000, email: address, scope: conn.GMAIL_REQUIRED_SCOPE,
  });
  return gmail.linkGmailMailbox(ws, userId, address);
}

async function emailConversation(ws: string, email: string): Promise<string> {
  const { findOrCreateContactByEmail, findOrCreateEmailConversation } = await import('@/lib/email/contactConversation');
  const contact: any = await findOrCreateContactByEmail(db, ws, email, null);
  if (contact.error) throw new Error(`contact: ${contact.error}`);
  const c: any = await findOrCreateEmailConversation(db, ws, contact.id, 'Email');
  if (c.error) throw new Error(`conversation: ${c.error}`);
  return c.id;
}

const email = (over: Partial<import('@/lib/email/emailMessageStore').EmailMessageInsert> = {}) => ({
  workspaceId: alice.ws, conversationId: convA, direction: 'inbound' as const,
  text: 'Quote attached', subject: 'Re: quote', from: { address: `client-${runId}@example.com`, name: 'Client' },
  to: [{ address: `alice-${runId}@gmail.test` }], cc: [{ address: `bob-${runId}@gmail.test` }],
  ...over,
});
const countIn = async (conversationId: string) => (await db.from('messages').select('id').eq('conversation_id', conversationId)).data.length;

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  db = (await import('@/lib/supabase/server')).createAdminClient();
  const swept = await sweepStaleTestWorkspaces(db, testRunPatterns('emm'));
  if (swept) console.warn(`[cleanup] removed ${swept} stale workspace(s) left by earlier runs of this test`);
  store = await import('@/lib/email/emailMessageStore');
  gmail = await import('@/lib/gmail/connection');
  conn = await import('@/lib/calendar/connections');

  alice = await mkUser('a');
  bob = await mkUser('b');
  const { error: joinErr } = await db.from('workspace_members').insert({ workspace_id: alice.ws, user_id: bob.id, role: 'member', permissions: ['communication'] });
  if (joinErr) throw new Error(`join: ${joinErr.message}`);
  bob.ws = alice.ws;
  nomod = await mkUser('n');
  const { error: join2Err } = await db.from('workspace_members').insert({ workspace_id: alice.ws, user_id: nomod.id, role: 'member', permissions: ['dashboard'] });
  if (join2Err) throw new Error(`join nomod: ${join2Err.message}`);
  other = await mkUser('o');

  mailboxAlice = await connectGmail(alice.ws, alice.id, `alice-${runId}@gmail.test`);
  mailboxBob = await connectGmail(alice.ws, bob.id, `bob-${runId}@gmail.test`);
  otherMailbox = await connectGmail(other.ws, other.id, `other-${runId}@gmail.test`);
  convA = await emailConversation(alice.ws, `client-${runId}@example.com`);
  convB = await emailConversation(alice.ws, `second-${runId}@example.com`);
});

afterAll(async () => {
  await deleteTestWorkspaces(db, wsIds, userIds);
});

describe('Message-ID duplicate detection', () => {
  let firstId = '';

  it('stores an email with all its email fields', async () => {
    const res = await store.insertEmailMessage(db, email({
      mailboxId: mailboxAlice, providerMessageId: 'g-alice-1', providerThreadId: 't-alice-1',
      messageId: '<CAF-1@mail.example.com>', inReplyTo: '<CAF-0@mail.example.com>',
      references: '<CAF-root@mail.example.com> <CAF-0@mail.example.com>', html: '<p>Quote attached</p>',
    }));
    expect(res.status).toBe('inserted');
    firstId = (res as any).id;
    const row = (await db.from('messages').select('*').eq('id', firstId).single()).data;
    expect(row).toMatchObject({
      rfc_message_id: 'CAF-1@mail.example.com', in_reply_to: 'CAF-0@mail.example.com',
      email_references: ['CAF-root@mail.example.com', 'CAF-0@mail.example.com'],
      html_body: '<p>Quote attached</p>', email_from_address: `client-${runId}@example.com`,
      email_cc: [{ address: `bob-${runId}@gmail.test`, name: null }], mailbox_id: mailboxAlice,
      provider_thread_id: 't-alice-1', provider_message_id: 'g-alice-1',
    });
  });

  it('the SAME email reaching a CC\'d teammate\'s mailbox is a duplicate (one row, not two)', async () => {
    const res = await store.insertEmailMessage(db, email({
      mailboxId: mailboxBob, providerMessageId: 'g-bob-77', providerThreadId: 't-bob-9',
      messageId: ' <CAF-1@mail.example.com>\r\n',
    }));
    expect(res).toEqual({ status: 'duplicate', id: firstId, matchedOn: 'rfc_message_id' });
    expect(await countIn(convA)).toBe(1);
  });

  it('two concurrent deliveries of one email still produce exactly one row', async () => {
    const results = await Promise.all([
      store.insertEmailMessage(db, email({ mailboxId: mailboxAlice, providerMessageId: 'g-alice-2', messageId: '<race@x>' })),
      store.insertEmailMessage(db, email({ mailboxId: mailboxBob, providerMessageId: 'g-bob-2', messageId: '<race@x>' })),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual(['duplicate', 'inserted']);
    expect((await db.from('messages').select('id').eq('conversation_id', convA).eq('rfc_message_id', 'race@x')).data).toHaveLength(1);
  });

  it('does NOT false-positive: different Message-IDs with identical subject, body and sender are both kept', async () => {
    const a = await store.insertEmailMessage(db, email({ messageId: '<same-looking-1@x>' }));
    const b = await store.insertEmailMessage(db, email({ messageId: '<same-looking-2@x>' }));
    expect([a.status, b.status]).toEqual(['inserted', 'inserted']);
  });

  it('Message-ID case matters (a different id, not a duplicate)', async () => {
    expect((await store.insertEmailMessage(db, email({ messageId: '<Case@x>' }))).status).toBe('inserted');
    expect((await store.insertEmailMessage(db, email({ messageId: '<case@x>' }))).status).toBe('inserted');
  });

  it('is scoped to the conversation: one email to two contacts lands in both threads', async () => {
    const res = await store.insertEmailMessage(db, email({ conversationId: convB, messageId: '<CAF-1@mail.example.com>' }));
    expect(res.status).toBe('inserted');
  });

  it('a mailbox re-syncing an email with NO Message-ID is caught by its Gmail id instead', async () => {
    const first = await store.insertEmailMessage(db, email({ mailboxId: mailboxAlice, providerMessageId: 'g-no-mid' }));
    const again = await store.insertEmailMessage(db, email({ mailboxId: mailboxAlice, providerMessageId: 'g-no-mid' }));
    expect(first.status).toBe('inserted');
    expect(again).toEqual({ status: 'duplicate', id: (first as any).id, matchedOn: 'provider_message_id' });
    // ...but the same Gmail id in a DIFFERENT mailbox is a different message.
    expect((await store.insertEmailMessage(db, email({ mailboxId: mailboxBob, providerMessageId: 'g-no-mid' }))).status).toBe('inserted');
  });

  it('a malformed Message-ID is rejected by the column check, never stored with brackets', async () => {
    const { error } = await db.from('messages').insert({
      workspace_id: alice.ws, conversation_id: convA, direction: 'inbound', content: 'x', rfc_message_id: '<bad@x>',
    });
    expect(error?.code).toBe('23514');
  });
});

describe('external_id is unique per workspace, not database-wide', () => {
  it('the same external_id is allowed in two workspaces, rejected twice in one', async () => {
    const ext = `ext-${runId}`;
    const otherConv = await emailConversation(other.ws, `x-${runId}@example.com`);
    const base = { direction: 'inbound', content: 'x', external_id: ext };
    expect((await db.from('messages').insert({ ...base, workspace_id: alice.ws, conversation_id: convA })).error).toBeNull();
    expect((await db.from('messages').insert({ ...base, workspace_id: other.ws, conversation_id: otherConv })).error).toBeNull();
    expect((await db.from('messages').insert({ ...base, workspace_id: alice.ws, conversation_id: convB })).error?.code).toBe('23505');
  });
});

describe('mailbox link', () => {
  it('a member cannot point one of their messages at another tenant\'s mailbox', async () => {
    const mine = (await db.from('messages').select('id').eq('conversation_id', convA).limit(1).single()).data.id;
    // User session: the batch-4 ownership trigger (not your mailbox) rejects it first.
    const res = await bob.client.from('messages').update({ mailbox_id: otherMailbox }).eq('id', mine).select('id');
    expect(res.error?.code).toBe('42501');
    // Server-side (service role skips the trigger): the same-workspace composite FK still rejects it.
    const srv = await db.from('messages').update({ mailbox_id: otherMailbox }).eq('id', mine);
    expect(srv.error?.code).toBe('23503');
    const ok = await bob.client.from('messages').update({ mailbox_id: mailboxBob }).eq('id', mine).select('id');
    expect(ok.error).toBeNull();
  });

  it('members can see their workspace\'s mailboxes but cannot write them; other tenants see nothing', async () => {
    expect((await bob.client.from('email_mailboxes').select('id').eq('workspace_id', alice.ws)).data).toHaveLength(2);
    expect((await bob.client.from('email_mailboxes').insert({ workspace_id: alice.ws, provider: 'gmail', email_address: `x-${runId}@x.com` })).error).toBeTruthy();
    expect((await other.client.from('email_mailboxes').select('id').eq('workspace_id', alice.ws)).data).toHaveLength(0);
    // Same module gate as messages: a member without Communication sees none.
    expect((await nomod.client.from('email_mailboxes').select('id').eq('workspace_id', alice.ws)).data).toHaveLength(0);
  });

  it('disconnect keeps the mailbox and every message link; reconnect re-attaches the same mailbox', async () => {
    const linked = (await db.from('messages').select('id').eq('mailbox_id', mailboxAlice)).data.length;
    expect(linked).toBeGreaterThan(0);

    await conn.deleteCalendarConnection(alice.ws, alice.id, 'gmail');
    const after = (await db.from('email_mailboxes').select('connection_id').eq('id', mailboxAlice).single()).data;
    expect(after.connection_id).toBeNull();
    expect((await db.from('messages').select('id').eq('mailbox_id', mailboxAlice)).data.length).toBe(linked);

    expect(await connectGmail(alice.ws, alice.id, `alice-${runId}@gmail.test`)).toBe(mailboxAlice);
    expect((await db.from('email_mailboxes').select('connection_id').eq('id', mailboxAlice).single()).data.connection_id).toBeTruthy();
  });

  it('reconnecting with a DIFFERENT Google account does not relabel old mail', async () => {
    const connectionId = (await db.from('email_mailboxes').select('connection_id').eq('id', mailboxAlice).single()).data.connection_id;
    const newMailbox = await connectGmail(alice.ws, alice.id, `alice-work-${runId}@gmail.test`);
    expect(newMailbox).not.toBe(mailboxAlice);
    const rows = (await db.from('email_mailboxes').select('id, email_address, connection_id').in('id', [mailboxAlice, newMailbox])).data;
    const byId = Object.fromEntries(rows.map((r: any) => [r.id, r]));
    expect(byId[mailboxAlice]).toMatchObject({ email_address: `alice-${runId}@gmail.test`, connection_id: null });
    expect(byId[newMailbox]).toMatchObject({ email_address: `alice-work-${runId}@gmail.test`, connection_id: connectionId });
    expect((await db.from('messages').select('id').eq('mailbox_id', mailboxAlice)).data.length).toBeGreaterThan(0);
  });
});

describe('attachments', () => {
  it('stored against a message, readable by members, not writable by them, removed with the message', async () => {
    const msg = await store.insertEmailMessage(db, email({ messageId: `<att-${runId}@x>` }));
    const id = (msg as any).id;
    const ins = await db.from('message_attachments').insert([
      { workspace_id: alice.ws, message_id: id, filename: 'quote.pdf', content_type: 'application/pdf', size_bytes: 1234, provider_attachment_id: 'ANGjdJ-1', is_inline: false, content_id: null, storage_path: null },
      { workspace_id: alice.ws, message_id: id, filename: 'logo.png', content_type: 'image/png', size_bytes: null, provider_attachment_id: null, is_inline: true, content_id: 'logo1', storage_path: `${alice.ws}/${id}/logo.png` },
    ]);
    expect(ins.error).toBeNull();
    expect((await db.from('message_attachments').insert({ workspace_id: alice.ws, message_id: id, filename: 'nowhere.bin' })).error?.code).toBe('23514');

    expect((await bob.client.from('message_attachments').select('filename').eq('message_id', id)).data).toHaveLength(2);
    expect((await bob.client.from('message_attachments').insert({ workspace_id: alice.ws, message_id: id, filename: 'x', storage_path: 'x' })).error).toBeTruthy();
    expect((await other.client.from('message_attachments').select('id').eq('message_id', id)).data).toHaveLength(0);
    expect((await nomod.client.from('message_attachments').select('id').eq('message_id', id)).data).toHaveLength(0);

    await db.from('messages').delete().eq('id', id);
    expect((await db.from('message_attachments').select('id').eq('message_id', id)).data).toHaveLength(0);
  });

  it('the private bucket exists and is not public', async () => {
    const { data } = await db.storage.getBucket('message-attachments');
    expect(data).toMatchObject({ id: 'message-attachments', public: false });
  });
});
