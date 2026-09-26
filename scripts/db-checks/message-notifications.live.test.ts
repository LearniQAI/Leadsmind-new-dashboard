// Live verification: new-message notifications + unread counts (migration 20260930000012).
// Real DB, real signed-in users (RLS + Realtime as those users), the real notification trigger, the
// real Resend inbound handler and Gmail insert path, the real markConversationsRead server action.
// Only Resend's HTTP (receiving API) is faked. Throwaway workspace; nothing here touches real users.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
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

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const runId = randomUUID().slice(0, 8);
const realFetch = globalThis.fetch;

let db: any, ws = '', otherWs = '', slug = '';
const userIds: string[] = [];
type U = { id: string; client: any };
let alice: U, bob: U, carol: U, outsider: U;
let waConv = '', igConv = '', emailConv = '', emailContact = '';
const aliceEvents: any[] = [];
const aliceReadEvents: any[] = [];
let aliceChannel: any;

async function mkUser(tag: string): Promise<U> {
  const email = `mnt-${runId}-${tag}-owner@example.com`;
  const password = randomUUID();
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`createUser: ${error.message}`);
  userIds.push(data.user.id);
  await new Promise((r) => setTimeout(r, 800));
  const client = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: e2 } = await client.auth.signInWithPassword({ email, password });
  if (e2) throw new Error(`signIn: ${e2.message}`);
  return { id: data.user.id, client };
}

async function conversation(platform: string, tag: string, extra: Record<string, any> = {}) {
  const contact = (await db.from('contacts').insert({ workspace_id: ws, first_name: `Pat ${tag}`, last_name: 'Customer', email: `${tag}-${runId}@example.com`, phone: `+2771${Math.floor(Math.random() * 1e7)}` }).select('id').single()).data;
  const conv = (await db.from('conversations').insert({ workspace_id: ws, contact_id: contact.id, platform, external_thread_id: platform === 'email' ? null : `${tag}-${runId}`, title: tag, ...extra }).select('id').single()).data;
  return { convId: conv.id as string, contactId: contact.id as string };
}
const inbound = (conversationId: string, content: string, extra: Record<string, any> = {}) =>
  db.from('messages').insert({ workspace_id: ws, conversation_id: conversationId, direction: 'inbound', content, ...extra }).select('id').single();
const notesFor = async (messageId: string) =>
  (await db.from('notifications').select('user_id, type, title, message, link, metadata').eq('type', 'message').filter('metadata->>message_id', 'eq', messageId)).data || [];
const unreadAs = async (u: U) => {
  const { data, error } = await u.client.rpc('conversation_unread_counts', { p_workspace_id: ws });
  if (error) throw error;
  const by: Record<string, number> = {};
  for (const r of data || []) by[r.conversation_id] = r.unread;
  return { total: Object.values(by).reduce((a, b) => a + b, 0), by };
};
const waitFor = async (pred: () => boolean, ms = 15_000) => {
  const t0 = Date.now();
  while (!pred() && Date.now() - t0 < ms) await new Promise((r) => setTimeout(r, 200));
  return pred();
};

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  db = (await import('@/lib/supabase/server')).createAdminClient();
  const swept = await sweepStaleTestWorkspaces(db, testRunPatterns('mnt'));
  if (swept) console.warn(`[cleanup] removed ${swept} stale workspace(s)`);

  alice = await mkUser('a'); // workspace owner (admin role at sign-up)
  ws = (await db.from('workspace_members').select('workspace_id').eq('user_id', alice.id).single()).data.workspace_id;
  h.workspaceId = ws;
  slug = (await db.from('workspaces').select('slug').eq('id', ws).single()).data.slug;
  bob = await mkUser('b');
  carol = await mkUser('c');
  outsider = await mkUser('o');
  otherWs = (await db.from('workspace_members').select('workspace_id').eq('user_id', outsider.id).single()).data.workspace_id;
  await db.from('workspace_members').insert([
    { workspace_id: ws, user_id: bob.id, role: 'member', permissions: ['communication'] },
    { workspace_id: ws, user_id: carol.id, role: 'member', permissions: ['dashboard'] },
  ]);

  ({ convId: waConv } = await conversation('whatsapp', 'wa'));
  ({ convId: igConv } = await conversation('instagram', 'ig'));
  const e = await conversation('email', 'mail');
  emailConv = e.convId;
  emailContact = e.contactId;

  // Alice's browser-equivalent Realtime subscriptions (same filters the header bell / unread store use).
  aliceChannel = alice.client
    .channel(`t-${runId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${alice.id}` }, (p: any) => aliceEvents.push(p.new))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_reads', filter: `user_id=eq.${alice.id}` }, (p: any) => aliceReadEvents.push(p.new))
    .subscribe();
  await waitFor(() => aliceChannel.state === 'joined', 10_000);
  await new Promise((r) => setTimeout(r, 1500));

  globalThis.fetch = (async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.includes('api.resend.com/emails/receiving/')) {
      return new Response(JSON.stringify({ text: 'Is the quote still valid?', html: '<p>Is the quote still valid?</p>' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return realFetch(input, init);
  }) as any;
});

afterAll(async () => {
  globalThis.fetch = realFetch;
  if (aliceChannel) await alice.client.removeChannel(aliceChannel);
  await deleteTestWorkspaces(db, [ws, otherWs], userIds);
});

describe('one notification per new inbound message, with the right channel', () => {
  it('WhatsApp: owner + members with Communication are notified (not members without it), deep-linked, live over Realtime', async () => {
    const before = aliceEvents.length;
    const msg = (await inbound(waConv, 'Hi, is the car still for sale?')).data;
    const notes = await notesFor(msg.id);
    expect(notes.map((n: any) => n.user_id).sort()).toEqual([alice.id, bob.id].sort());
    expect(notes[0]).toMatchObject({
      title: 'Pat wa Customer', message: 'Hi, is the car still for sale?', link: `/conversations?c=${waConv}`,
      metadata: expect.objectContaining({ platform: 'whatsapp', conversation_id: waConv, message_id: msg.id }),
    });
    expect(await waitFor(() => aliceEvents.length > before)).toBe(true);
    expect(aliceEvents.at(-1).metadata.platform).toBe('whatsapp');
  });

  it('Instagram carries its own channel', async () => {
    const msg = (await inbound(igConv, 'Love the new collection 😍')).data;
    const notes = await notesFor(msg.id);
    expect(notes).toHaveLength(2);
    expect(notes.every((n: any) => n.metadata.platform === 'instagram')).toBe(true);
  });

  it('an assigned conversation notifies only its assignee', async () => {
    const { convId } = await conversation('instagram', 'assigned', { assigned_to: bob.id });
    const msg = (await inbound(convId, 'For Bob')).data;
    expect((await notesFor(msg.id)).map((n: any) => n.user_id)).toEqual([bob.id]);
  });

  it('outbound messages and history imports never notify', async () => {
    const out = (await db.from('messages').insert({ workspace_id: ws, conversation_id: waConv, direction: 'outbound', content: 'reply' }).select('id').single()).data;
    const hist = (await inbound(emailConv, 'old mail from 2024', { historical_import: true })).data;
    expect(await notesFor(out.id)).toHaveLength(0);
    expect(await notesFor(hist.id)).toHaveLength(0);
  });
});

describe('dual-path email: one message row, one notification per person', () => {
  const store = () => import('@/lib/email/emailMessageStore');
  const resendDeliver = async (mid: string) => {
    const { handleInboundWorkspaceEmail } = await import('@/lib/email/inboundEmailProcessing');
    const { extractInboundMessageId } = await import('@/lib/email/inboundPayload');
    const emailData = { email_id: randomUUID(), from: `Pat mail Customer <mail-${runId}@example.com>`, message_id: `<${mid}>`, to: [`${slug}@inbox.leadsmind.io`], cc: [], subject: 'Quote' };
    await handleInboundWorkspaceEmail({ emailData, from: emailData.from, messageId: extractInboundMessageId(emailData), workspaceSlug: slug });
  };
  const gmailDeliver = async (mid: string) =>
    (await store()).insertEmailMessage(db, {
      workspaceId: ws, conversationId: emailConv, direction: 'inbound', text: 'Is the quote still valid?',
      from: { address: `mail-${runId}@example.com` }, messageId: `<${mid}>`,
    });
  const countFor = async (mid: string) => {
    const rows = (await db.from('messages').select('id').eq('conversation_id', emailConv).eq('rfc_message_id', mid)).data || [];
    const notes = rows.length ? await notesFor(rows[0].id) : [];
    return { rows: rows.length, notes: notes.length, users: notes.map((n: any) => n.user_id).sort() };
  };

  it('Resend first, then Gmail sync sees the same email', async () => {
    const mid = `dual-a-${runId}@mail.gmail.com`;
    await resendDeliver(mid);
    expect((await gmailDeliver(mid)).status).toBe('duplicate');
    expect(await countFor(mid)).toEqual({ rows: 1, notes: 2, users: [alice.id, bob.id].sort() });
  });

  it('Gmail first, then the Resend webhook for the same email', async () => {
    const mid = `dual-b-${runId}@mail.gmail.com`;
    expect((await gmailDeliver(mid)).status).toBe('inserted');
    await resendDeliver(mid);
    expect(await countFor(mid)).toEqual({ rows: 1, notes: 2, users: [alice.id, bob.id].sort() });
  });

  it('the email notification carries the email channel and subject', async () => {
    const mid = `dual-a-${runId}@mail.gmail.com`;
    const row = (await db.from('messages').select('id').eq('rfc_message_id', mid).single()).data;
    const [n] = await notesFor(row.id);
    expect(n.metadata).toMatchObject({ platform: 'email', subject: 'Quote', conversation_id: emailConv });
  });
});

describe('unread counts are real, per user, and drop when read', () => {
  it('counts inbound, non-imported messages per conversation; a user without Communication sees none', async () => {
    const a = await unreadAs(alice);
    expect(a.by[waConv]).toBe(1);
    expect(a.by[igConv]).toBe(1);
    expect(a.by[emailConv]).toBe(2); // the two distinct emails; the history import doesn't count
    expect((await unreadAs(carol)).total).toBe(0);
  });

  it('reading a conversation drops only that user\'s count, clears its notifications, and is pushed live', async () => {
    const { markConversationsRead } = await import('@/app/actions/conversationReads');
    const before = await unreadAs(alice);
    const bobBefore = await unreadAs(bob);
    const readEventsBefore = aliceReadEvents.length;

    h.userId = alice.id;
    h.userClient = alice.client;
    expect(await markConversationsRead([waConv, emailConv])).toEqual({ success: true });

    const after = await unreadAs(alice);
    expect(after.total).toBe(before.total - before.by[waConv] - before.by[emailConv]);
    expect(after.by[waConv]).toBeUndefined();
    expect(after.by[igConv]).toBe(1);
    expect(await unreadAs(bob)).toEqual(bobBefore);
    expect(await waitFor(() => aliceReadEvents.length >= readEventsBefore + 2)).toBe(true);

    const aliceWaNotes = (await db.from('notifications').select('read').eq('user_id', alice.id).filter('metadata->>conversation_id', 'eq', waConv)).data;
    expect(aliceWaNotes.every((n: any) => n.read)).toBe(true);
    const bobWaNotes = (await db.from('notifications').select('read').eq('user_id', bob.id).filter('metadata->>conversation_id', 'eq', waConv)).data;
    expect(bobWaNotes.some((n: any) => !n.read)).toBe(true);
  });

  it('a new message after reading counts again', async () => {
    await inbound(waConv, 'One more thing…');
    expect((await unreadAs(alice)).by[waConv]).toBe(1);
  });

  it('a user cannot mark read (or see read state) for another workspace\'s conversation', async () => {
    const { markConversationsRead } = await import('@/app/actions/conversationReads');
    h.userId = outsider.id;
    h.userClient = outsider.client;
    await markConversationsRead([waConv]);
    expect((await db.from('conversation_reads').select('user_id').eq('conversation_id', waConv).eq('user_id', outsider.id)).data).toHaveLength(0);
    const forged = await outsider.client.from('conversation_reads').insert({ conversation_id: waConv, user_id: outsider.id, workspace_id: ws });
    expect(forged.error).toBeTruthy();
  });
});

describe('notifications can no longer be forged across workspaces', () => {
  it('outsider cannot insert a notification into Alice\'s feed; a teammate still can', async () => {
    const forged = await outsider.client.from('notifications').insert({ workspace_id: ws, user_id: alice.id, type: 'message', title: 'Reset your password', message: 'x', link: 'https://evil.example' });
    expect(forged.error).toBeTruthy();
    const crossWs = await outsider.client.from('notifications').insert({ workspace_id: otherWs, user_id: alice.id, type: 'system', title: 'x', message: 'x' });
    expect(crossWs.error).toBeTruthy();
    const teammate = await bob.client.from('notifications').insert({ workspace_id: ws, user_id: alice.id, type: 'team', title: 'FYI', message: 'hello' });
    expect(teammate.error).toBeNull();
  });
});
