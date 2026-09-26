// Live verification, Conversations batch 4: Gmail send path, outbound routing, mailbox ownership,
// retry queue, and the Resend inbound Message-ID backfill / cross-path dedup.
//
// Real database, real signed-in users (RLS), the REAL sendMessage() server action, the real
// dispatchOutboundMessage() / sendEmailViaGmail() / handleInboundWorkspaceEmail(). Only HTTP to
// Google (gmail.googleapis.com) and Resend (api.resend.com) is faked. This proves the code path; it
// does NOT prove a real Gmail inbox receives/threads the email (that needs a real connected account).
//
// The retry-worker ROUTE is deliberately not called: acquire_message_jobs claims every pending job in
// the production queue. The worker's per-job call — dispatchOutboundMessage(context 'worker') with the
// queue row's mailbox_id / sender_user_id — is exercised directly instead.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';

const h = vi.hoisted(() => ({ workspaceId: '', userId: '', userClient: null as any }));
vi.mock('@/lib/auth', async (orig) => {
  const actual = await orig<any>();
  return {
    ...actual,
    getCurrentWorkspaceId: async () => h.workspaceId,
    requireWorkspaceAccess: async () => ({ workspaceId: h.workspaceId, userId: h.userId, role: 'member' }),
  };
});
vi.mock('@/lib/supabase/server', async (orig) => {
  const actual = await orig<any>();
  return { ...actual, createServerClient: async () => h.userClient };
});
vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock('next/navigation', () => ({ redirect: () => {} }));

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const runId = randomUUID().slice(0, 8);
const CONTACT = `client-${runId}@example.com`;

// ---- fake Google + Resend --------------------------------------------------------------------
const realFetch = globalThis.fetch;
type Call = { url: string; method: string; auth: string | null; body: any };
let calls: Call[] = [];
const gmail = { sendStatus: 200, sendReason: '' as string, searchHit: null as null | { id: string; threadId: string }, n: 0 };
let resendReceiving: any = null;

function decodeRaw(raw: string): string {
  return Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}
const json = (status: number, obj: any) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

async function fakeFetch(input: any, init?: any): Promise<Response> {
  const url = typeof input === 'string' ? input : input.url;
  const isGoogle = url.includes('googleapis.com');
  const isResend = url.includes('api.resend.com');
  if (!isGoogle && !isResend) return realFetch(input, init);
  const hdrs = init?.headers || {};
  const auth = hdrs.Authorization || hdrs.authorization || (typeof hdrs.get === 'function' ? hdrs.get('authorization') : null) || null;
  let body: any = init?.body;
  try { body = body ? JSON.parse(String(body)) : null; } catch { /* form bodies */ }
  calls.push({ url, method: init?.method || 'GET', auth, body });

  if (isResend) {
    if (url.includes('/emails/receiving/')) return json(200, resendReceiving || {});
    return json(200, { id: `resend-${randomUUID()}` });
  }
  if (url.includes('/messages/send')) {
    if (gmail.sendStatus !== 200) {
      return json(gmail.sendStatus, { error: { code: gmail.sendStatus, message: `fake ${gmail.sendStatus}`, errors: [{ reason: gmail.sendReason }] } });
    }
    gmail.n += 1;
    const threadId = body?.threadId || `thread-${runId}-${gmail.n}`;
    return json(200, { id: `gmsg-${runId}-${gmail.n}`, threadId, labelIds: ['SENT'] });
  }
  if (/\/messages\?q=/.test(url)) return json(200, gmail.searchHit ? { messages: [gmail.searchHit] } : { resultSizeEstimate: 0 });
  if (/\/messages\/[^/?]+\?format=metadata/.test(url)) {
    const id = decodeURIComponent(url.split('/messages/')[1].split('?')[0]);
    return json(200, { id, payload: { headers: [{ name: 'Message-ID', value: `<CAgmail-${id}@mail.gmail.com>` }] } });
  }
  return json(404, { error: 'unexpected google url in test' });
}

// ---- world -----------------------------------------------------------------------------------
let db: any, ws = '', slug = '';
const userIds: string[] = [];
type U = { id: string; client: any };
let alice: U, bob: U, carol: U;
let mbAlice = '', mbBob = '', conv = '', contactId = '';
let M: {
  sendMessage: typeof import('@/app/actions/messaging').sendMessage;
  dispatch: typeof import('@/lib/messaging/dispatchOutboundMessage').dispatchOutboundMessage;
  store: typeof import('@/lib/email/emailMessageStore');
  inbound: typeof import('@/lib/email/inboundEmailProcessing');
  payload: typeof import('@/lib/email/inboundPayload');
};

async function mkUser(tag: string): Promise<U> {
  const email = `gms-${runId}-${tag}-owner@example.com`;
  const password = randomUUID();
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`createUser: ${error.message}`);
  userIds.push(data.user.id);
  await new Promise((r) => setTimeout(r, 800));
  const client = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: e2 } = await client.auth.signInWithPassword({ email, password });
  if (e2) throw new Error(`signIn: ${e2.message}`);
  await db.from('users').update({ first_name: tag.toUpperCase(), last_name: 'Agent' }).eq('id', data.user.id);
  return { id: data.user.id, client };
}

async function connectGmail(userId: string, address: string, token: string): Promise<string> {
  const conn = await import('@/lib/calendar/connections');
  const g = await import('@/lib/gmail/connection');
  await conn.storeCalendarConnection({
    workspaceId: ws, userId, provider: 'gmail', accessToken: token, refreshToken: `r-${token}`,
    expiresAt: Date.now() + 3_600_000, email: address, scope: conn.GMAIL_REQUIRED_SCOPE,
  });
  return g.linkGmailMailbox(ws, userId, address);
}

const as = (u: U) => { h.userId = u.id; h.userClient = u.client; };
const gmailSends = () => calls.filter((c) => c.url.includes('/messages/send'));
const resendSends = () => calls.filter((c) => c.url.includes('api.resend.com/emails') && !c.url.includes('receiving'));
const lastRow = async () => (await db.from('messages').select('*').eq('conversation_id', conv).eq('direction', 'outbound').order('created_at', { ascending: false }).limit(1).single()).data;
const headerOf = (raw: string, name: string) =>
  raw.split('\r\n\r\n')[0].split('\r\n').find((l) => l.toLowerCase().startsWith(`${name.toLowerCase()}:`))?.slice(name.length + 1).trim() ?? null;

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  db = (await import('@/lib/supabase/server')).createAdminClient();
  const swept = await sweepStaleTestWorkspaces(db, testRunPatterns('gms'));
  if (swept) console.warn(`[cleanup] removed ${swept} stale workspace(s) left by earlier runs of this test`);

  alice = await mkUser('a');
  const wsRow = (await db.from('workspace_members').select('workspace_id').eq('user_id', alice.id).single()).data;
  ws = wsRow.workspace_id;
  h.workspaceId = ws;
  slug = (await db.from('workspaces').select('slug').eq('id', ws).single()).data.slug;
  bob = await mkUser('b');
  carol = await mkUser('c');
  for (const u of [bob, carol]) {
    const { error } = await db.from('workspace_members').insert({ workspace_id: ws, user_id: u.id, role: 'member', permissions: ['communication'] });
    if (error) throw new Error(`join: ${error.message}`);
  }

  globalThis.fetch = fakeFetch as any;
  M = {
    sendMessage: (await import('@/app/actions/messaging')).sendMessage,
    dispatch: (await import('@/lib/messaging/dispatchOutboundMessage')).dispatchOutboundMessage,
    store: await import('@/lib/email/emailMessageStore'),
    inbound: await import('@/lib/email/inboundEmailProcessing'),
    payload: await import('@/lib/email/inboundPayload'),
  };

  mbAlice = await connectGmail(alice.id, `alice-${runId}@gmail.test`, 'alice-token');
  mbBob = await connectGmail(bob.id, `bob-${runId}@gmail.test`, 'bob-token');

  const { findOrCreateContactByEmail, findOrCreateEmailConversation } = await import('@/lib/email/contactConversation');
  const c: any = await findOrCreateContactByEmail(db, ws, CONTACT, 'Client Person');
  contactId = c.id;
  conv = ((await findOrCreateEmailConversation(db, ws, contactId, 'Email')) as any).id;

  // The thread so far: the contact's email arrived through ALICE's mailbox (a Gmail thread of hers).
  const seeded = await M.store.insertEmailMessage(db, {
    workspaceId: ws, conversationId: conv, direction: 'inbound', text: 'Can you send the quote?', subject: 'Quote request',
    from: { address: CONTACT, name: 'Client Person' }, to: [{ address: `alice-${runId}@gmail.test` }],
    messageId: `<orig-${runId}@mail.example.com>`, references: `<root-${runId}@mail.example.com>`,
    mailboxId: mbAlice, providerThreadId: 'alice-thread-1', providerMessageId: 'alice-gmsg-1',
  });
  if (seeded.status !== 'inserted') throw new Error('seed failed');
});

afterEach(() => { calls = []; gmail.sendStatus = 200; gmail.sendReason = ''; gmail.searchHit = null; });

afterAll(async () => {
  globalThis.fetch = realFetch;
  // Dead letters carry the workspace only inside their JSON payload (no FK), so the cascade misses them.
  if (ws) await db.from('webhook_dead_letters').delete().eq('provider', 'message_send').filter('payload->>workspace_id', 'eq', ws);
  await deleteTestWorkspaces(db, [ws], userIds);
});

describe('outbound routing', () => {
  it('Bob replies: sent through BOB\'s own Gmail, never Alice\'s, even though the thread came in through Alice', async () => {
    as(bob);
    const res = await M.sendMessage(conv, 'Here is the quote.');
    expect(res).toEqual({ success: true });

    const sends = gmailSends();
    expect(sends).toHaveLength(1);
    expect(sends[0].auth).toBe('Bearer bob-token');
    expect(calls.some((c) => c.auth === 'Bearer alice-token')).toBe(false);
    expect(resendSends()).toHaveLength(0);
    // Alice's Gmail thread id is per-mailbox and must not be reused from Bob's mailbox.
    expect(sends[0].body.threadId).toBeUndefined();

    const raw = decodeRaw(sends[0].body.raw);
    expect(headerOf(raw, 'From')).toBe(`"B Agent" <bob-${runId}@gmail.test>`);
    expect(headerOf(raw, 'To')).toBe(`"Client Person" <${CONTACT}>`);
    expect(headerOf(raw, 'Subject')).toBe('Re: Quote request');
    expect(headerOf(raw, 'In-Reply-To')).toBe(`<orig-${runId}@mail.example.com>`);
    expect(headerOf(raw, 'References')).toBe(`<root-${runId}@mail.example.com> <orig-${runId}@mail.example.com>`);

    const row = await lastRow();
    expect(row).toMatchObject({
      status: 'sent', mailbox_id: mbBob, provider_message_id: `gmsg-${runId}-1`, provider_thread_id: `thread-${runId}-1`,
      rfc_message_id: `CAgmail-gmsg-${runId}-1@mail.gmail.com`, in_reply_to: `orig-${runId}@mail.example.com`,
      email_from_address: `bob-${runId}@gmail.test`, subject: 'Re: Quote request',
    });
  });

  it('Bob\'s next reply threads onto his own Gmail thread and the previous email', async () => {
    as(bob);
    expect(await M.sendMessage(conv, 'Following up.')).toEqual({ success: true });
    const body = gmailSends()[0].body;
    expect(body.threadId).toBe(`thread-${runId}-1`);
    expect(headerOf(decodeRaw(body.raw), 'In-Reply-To')).toBe(`<CAgmail-gmsg-${runId}-1@mail.gmail.com>`);
  });

  it('Carol has no Gmail: falls back to the existing Resend inbox-address path, no Gmail call', async () => {
    as(carol);
    expect(await M.sendMessage(conv, 'From the team inbox.')).toEqual({ success: true });
    expect(gmailSends()).toHaveLength(0);
    const r = resendSends();
    expect(r).toHaveLength(1);
    // Unchanged fallback: replies still come back to the workspace alias.
    expect(JSON.stringify(r[0].body.reply_to)).toContain(`${slug}@`);
    expect((await lastRow()).mailbox_id).toBeNull();
  });

  it('a sender whose Gmail needs reconnecting falls back to Resend rather than failing', async () => {
    const conn = (await db.from('email_mailboxes').select('connection_id').eq('id', mbAlice).single()).data.connection_id;
    await db.from('user_calendar_connections').update({ status: 'error' }).eq('id', conn);
    as(alice);
    expect(await M.sendMessage(conv, 'Alice while disconnected.')).toEqual({ success: true });
    expect(gmailSends()).toHaveLength(0);
    expect(resendSends()).toHaveLength(1);
    await db.from('user_calendar_connections').update({ status: 'connected' }).eq('id', conn);
  });
});

describe('mailbox ownership is enforced server-side', () => {
  it('a member cannot link one of their messages to a teammate\'s mailbox (DB trigger), but can use their own', async () => {
    const mine = (await lastRow()).id;
    const steal = await bob.client.from('messages').update({ mailbox_id: mbAlice }).eq('id', mine).select('id');
    expect(steal.error?.code).toBe('42501');
    const forged = await bob.client.from('messages').insert({ workspace_id: ws, conversation_id: conv, direction: 'outbound', content: 'x', status: 'failed', mailbox_id: mbAlice });
    expect(forged.error?.code).toBe('42501');
    const own = await bob.client.from('messages').insert({ workspace_id: ws, conversation_id: conv, direction: 'outbound', content: 'x', status: 'failed', mailbox_id: mbBob }).select('id').single();
    expect(own.error).toBeNull();
    await db.from('messages').delete().eq('id', own.data.id);
  });

  it('even with a teammate\'s mailbox on the message row, sendMessage sends through the CALLER\'s own mailbox', async () => {
    // Service role plants Alice's mailbox on a failed row of Bob's (what a trusted sync might do).
    const uuid = randomUUID();
    await db.from('messages').insert({
      workspace_id: ws, conversation_id: conv, direction: 'outbound', content: 'retry me', status: 'failed',
      client_message_uuid: uuid, mailbox_id: mbAlice, metadata: { client_message_uuid: uuid },
    });
    as(bob);
    expect(await M.sendMessage(conv, 'retry me', undefined, undefined, uuid)).toEqual({ success: true });
    expect(gmailSends()).toHaveLength(1);
    expect(gmailSends()[0].auth).toBe('Bearer bob-token');
    expect((await db.from('messages').select('mailbox_id').eq('client_message_uuid', uuid).single()).data.mailbox_id).toBe(mbBob);
  });

  it('the worker refuses a job whose mailbox is not the sender\'s: no Gmail call, failed + dead letter', async () => {
    const msg = (await db.from('messages').insert({ workspace_id: ws, conversation_id: conv, direction: 'outbound', content: 'forged', status: 'retrying' }).select('*').single()).data;
    const out = await M.dispatch({ messagesClient: db }, {
      message: msg, platform: 'email', recipient: '', credentials: null, attemptNumber: 2, context: 'worker',
      email: { mailboxId: mbAlice, senderUserId: bob.id },
    });
    expect(out).toMatchObject({ outcome: 'failed', failureClass: 'permanent' });
    expect(calls.filter((c) => c.url.includes('gmail.googleapis.com'))).toHaveLength(0);
    const row = (await db.from('messages').select('status, metadata').eq('id', msg.id).single()).data;
    expect(row.status).toBe('failed');
    expect(row.metadata.error_type).toBe('mailbox_not_owned');
    const dl = (await db.from('webhook_dead_letters').select('error_type').eq('provider', 'message_send').filter('payload->>message_id', 'eq', msg.id)).data;
    expect(dl).toEqual([{ error_type: 'gmail_send_permanent_mailbox_not_owned' }]);
  });
});

describe('retry queue (same treatment as Meta)', () => {
  it('a Gmail 503 -> retrying, queue row records the sender + mailbox; the retry finds the earlier send and does not send twice', async () => {
    as(bob);
    gmail.sendStatus = 503;
    expect(await M.sendMessage(conv, 'Flaky network.')).toEqual({ retrying: true });
    const row = await lastRow();
    expect(row.status).toBe('retrying');
    const q = (await db.from('message_dispatch_queue').select('*').eq('message_id', row.id).single()).data;
    expect(q).toMatchObject({ platform: 'email', status: 'pending', attempt_count: 1, mailbox_id: mbBob, sender_user_id: bob.id });
    // Keep the deployed production cron (which predates this code) away from this test row.
    await db.from('message_dispatch_queue').update({ next_attempt_at: new Date(Date.now() + 86_400_000).toISOString() }).eq('id', q.id);

    // Worker attempt 2, exactly as the worker calls it: mailbox + sender from the QUEUE row.
    calls = [];
    gmail.sendStatus = 200;
    gmail.searchHit = { id: 'gmsg-reached-gmail', threadId: `thread-${runId}-1` };
    const out = await M.dispatch({ messagesClient: db }, {
      message: row, platform: 'email', recipient: '', credentials: null, attemptNumber: 2, context: 'worker',
      email: { mailboxId: q.mailbox_id, senderUserId: q.sender_user_id },
    });
    expect(out.outcome).toBe('sent');
    expect(gmailSends()).toHaveLength(0);
    expect(calls.some((c) => c.url.includes('rfc822msgid'))).toBe(true);
    expect(await lastRow()).toMatchObject({ status: 'sent', provider_message_id: 'gmsg-reached-gmail' });
    expect((await db.from('message_dispatch_queue').select('status').eq('id', q.id).single()).data.status).toBe('done');
  });

  it('a permanent Gmail error (400) fails immediately with a dead letter, no retry queued', async () => {
    as(bob);
    gmail.sendStatus = 400;
    gmail.sendReason = 'invalidArgument';
    const res: any = await M.sendMessage(conv, 'Bad request.');
    expect(res.error).toBeTruthy();
    const row = await lastRow();
    expect(row.status).toBe('failed');
    expect((await db.from('message_dispatch_queue').select('id').eq('message_id', row.id)).data).toHaveLength(0);
    const dl = (await db.from('webhook_dead_letters').select('error_type').filter('payload->>message_id', 'eq', row.id)).data;
    expect(dl[0].error_type).toBe('gmail_send_permanent_gmail_http_400_invalidArgument');
  });
});

describe('Resend inbound now carries the Message-ID; both paths dedupe against each other', () => {
  const deliver = async (mid: string, extra: any = {}) => {
    const emailData = {
      email_id: randomUUID(), from: `Client Person <${CONTACT}>`, message_id: `<${mid}>`,
      to: [`${slug}@inbox.leadsmind.io`], cc: [], subject: 'Re: Quote request', ...extra,
    };
    await M.inbound.handleInboundWorkspaceEmail({
      emailData, from: emailData.from, messageId: M.payload.extractInboundMessageId(emailData), workspaceSlug: slug,
    });
  };
  const rowsWith = async (mid: string) => (await db.from('messages').select('*').eq('conversation_id', conv).eq('rfc_message_id', mid)).data;

  it('a new Resend inbound message stores rfc_message_id, headers, html and addresses', async () => {
    const mid = `resend-first-${runId}@mail.gmail.com`;
    resendReceiving = { text: 'Thanks, received!', html: '<p>Thanks, received!</p>', headers: { 'In-Reply-To': `<CAgmail-gmsg-${runId}-1@mail.gmail.com>` } };
    await deliver(mid);
    const rows = await rowsWith(mid);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      direction: 'inbound', rfc_message_id: mid, in_reply_to: `CAgmail-gmsg-${runId}-1@mail.gmail.com`,
      html_body: '<p>Thanks, received!</p>', email_from_address: CONTACT, email_from_name: 'Client Person',
      email_to: [{ address: `${slug}@inbox.leadsmind.io`, name: null }],
    });
  });

  it('Resend first, then the same email via the Gmail path -> one row', async () => {
    const mid = `resend-first-${runId}@mail.gmail.com`;
    const g = await M.store.insertEmailMessage(db, {
      workspaceId: ws, conversationId: conv, direction: 'inbound', text: 'Thanks, received!',
      from: { address: CONTACT }, messageId: `<${mid}>`, mailboxId: mbBob, providerMessageId: 'bob-gmsg-sync-1',
    });
    expect(g.status).toBe('duplicate');
    expect(await rowsWith(mid)).toHaveLength(1);
  });

  it('Gmail first, then the same email via Resend -> the webhook stores nothing new and still succeeds', async () => {
    const mid = `gmail-first-${runId}@mail.gmail.com`;
    const g = await M.store.insertEmailMessage(db, {
      workspaceId: ws, conversationId: conv, direction: 'inbound', text: 'Second reply',
      from: { address: CONTACT }, messageId: `<${mid}>`, mailboxId: mbBob, providerMessageId: 'bob-gmsg-sync-2',
    });
    expect(g.status).toBe('inserted');
    resendReceiving = { text: 'Second reply' };
    await expect(deliver(mid)).resolves.toBeUndefined();
    expect(await rowsWith(mid)).toHaveLength(1);
  });

  it('a different email via Resend is NOT mistaken for a duplicate', async () => {
    resendReceiving = { text: 'A new question' };
    await deliver(`another-${runId}@mail.gmail.com`);
    expect(await rowsWith(`another-${runId}@mail.gmail.com`)).toHaveLength(1);
  });
});
