import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeFakeDb, rowsWritten, type FakeDb } from '@/test/fakeSupabase';

const h = vi.hoisted(() => ({ db: null as any, ws: 'wsB' }));

vi.mock('@/shared/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: async () => h.db, createAdminClient: () => h.db }));
vi.mock('@/lib/auth', () => ({
  getCurrentWorkspaceId: async () => h.ws,
  requireWorkspaceAccess: async () => ({ workspaceId: h.ws, userId: 'uB' }),
  requireModuleAccess: async () => {},
}));
vi.mock('@/lib/oauth/stateNonce', () => ({ createOAuthStateNonce: async () => 'n' }));
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/messaging/dispatchOutboundMessage', () => ({ dispatchOutboundMessage: vi.fn() }));
vi.mock('@/lib/gmail/send', () => ({ resolveSenderGmailMailbox: vi.fn() }));
vi.mock('@/lib/email/inboundAddress', () => ({ workspaceInboundAddress: vi.fn() }));
vi.mock('@/lib/email/resolveConfig', () => ({ getWorkspaceEmailConfig: vi.fn() }));
vi.mock('@/lib/automations/EmailAutomationService', () => ({ EmailAutomationService: {} }));
vi.mock('@/lib/crm/UnifiedActivityEngine', () => ({ UnifiedActivityEngine: {} }));
vi.mock('@/lib/meta/subscribeWebhook', () => ({ subscribeWabaToMetaWebhook: vi.fn() }));
vi.mock('@/lib/encryption', () => ({ encrypt: (s: string) => s, decrypt: (s: string) => s }));

import {
  sendMessage, sendInternalNote, updateConversationAssignment, updateConversationStatus, updateConversationTags,
  updateContactConsent, deleteQuickReply,
} from '@/app/actions/messaging';

const A_CONV = '11111111-1111-1111-1111-111111111111';
const B_CONV = '22222222-2222-2222-2222-222222222222';
const A_CONTACT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const B_CONTACT = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

let db: FakeDb;
const snapshot = (table: string) => JSON.stringify(db.tables[table]);

beforeEach(() => {
  h.ws = 'wsB';
  db = makeFakeDb({
    conversations: [
      { id: A_CONV, workspace_id: 'wsA', contact_id: A_CONTACT, platform: 'whatsapp', status: 'open', tags: [], assigned_to: null, last_message_at: 'x' },
      { id: B_CONV, workspace_id: 'wsB', contact_id: B_CONTACT, platform: 'whatsapp', status: 'open', tags: [], assigned_to: null, last_message_at: 'x' },
    ],
    messages: [{ id: 'm1', workspace_id: 'wsA', conversation_id: A_CONV, content: 'hi', direction: 'inbound' }],
    contacts: [
      { id: A_CONTACT, workspace_id: 'wsA', opted_in: true, opted_out: false },
      { id: B_CONTACT, workspace_id: 'wsB', opted_in: true, opted_out: false },
    ],
    quick_replies: [{ id: 'qA', workspace_id: 'wsA', shortcut: '/a', message: 'a' }, { id: 'qB', workspace_id: 'wsB', shortcut: '/b', message: 'b' }],
    workspace_members: [{ workspace_id: 'wsB', user_id: 'agentB' }, { workspace_id: 'wsA', user_id: 'agentA' }],
  });
  h.db = db;
});

const notFound = expect.objectContaining({ success: false, code: 'not_found' });

describe("workspace B cannot touch workspace A's conversation (each returns not-found, nothing written)", () => {
  it('sendMessage by conversation id', async () => {
    const before = snapshot('messages');
    const r: any = await sendMessage(A_CONV, 'cross-tenant');
    expect(r).toEqual(notFound);
    expect(rowsWritten(db)).toBe(0);
    expect(snapshot('messages')).toBe(before);
  });

  it("sendMessage by 'contact:<A contact>' alias", async () => {
    const r: any = await sendMessage(`contact:${A_CONTACT}`, 'cross-tenant');
    expect(r).toEqual(notFound);
    expect(rowsWritten(db)).toBe(0);
  });

  it('sendMessage with a malformed or unknown id', async () => {
    expect(await sendMessage('not-a-uuid', 'x')).toEqual(notFound);
    expect(await sendMessage('99999999-9999-9999-9999-999999999999', 'x')).toEqual(notFound);
    expect(rowsWritten(db)).toBe(0);
  });

  it('sendInternalNote', async () => {
    expect(await sendInternalNote(A_CONV, 'note')).toEqual(notFound);
    expect(rowsWritten(db)).toBe(0);
  });

  it('assign, status and tags leave A unchanged and report not-found (was: success:true)', async () => {
    const before = snapshot('conversations');
    expect(await updateConversationAssignment(A_CONV, 'agentB')).toEqual(notFound);
    expect(await updateConversationStatus(A_CONV, 'closed')).toEqual(notFound);
    expect(await updateConversationTags(A_CONV, ['vip'])).toEqual(notFound);
    expect(snapshot('conversations')).toBe(before);
    expect(rowsWritten(db)).toBe(0);
  });

  it('updateContactConsent and deleteQuickReply on A rows report not-found and change nothing', async () => {
    const c = snapshot('contacts'); const q = snapshot('quick_replies');
    expect(await updateContactConsent(A_CONTACT, false, true)).toEqual(notFound);
    expect(await deleteQuickReply('qA')).toEqual(notFound);
    expect(snapshot('contacts')).toBe(c);
    expect(snapshot('quick_replies')).toBe(q);
  });
});

describe("workspace B's own operations still work", () => {
  it('note, status, tags, assignment (to a member) update only B and report success', async () => {
    expect(await sendInternalNote(B_CONV, 'ok')).toMatchObject({ success: true });
    expect(await updateConversationStatus(B_CONV, 'closed')).toEqual({ success: true });
    expect(await updateConversationTags(B_CONV, ['vip'])).toEqual({ success: true });
    expect(await updateConversationAssignment(B_CONV, 'agentB')).toEqual({ success: true });
    const b = db.tables.conversations.find((c) => c.id === B_CONV)!;
    expect(b).toMatchObject({ status: 'closed', tags: ['vip'], assigned_to: 'agentB' });
    const a = db.tables.conversations.find((c) => c.id === A_CONV)!;
    expect(a).toMatchObject({ status: 'open', tags: [], assigned_to: null });
    expect(db.tables.messages.filter((m) => m.conversation_id === B_CONV && m.workspace_id === 'wsB')).toHaveLength(1);
  });

  it("assigning to a user who is not a member of the workspace (another tenant's agent) is refused", async () => {
    const r: any = await updateConversationAssignment(B_CONV, 'agentA');
    expect(r).toEqual(notFound);
    expect(db.tables.conversations.find((c) => c.id === B_CONV)!.assigned_to).toBeNull();
  });

  it('un-assigning (null) needs no member check', async () => {
    expect(await updateConversationAssignment(B_CONV, null)).toEqual({ success: true });
  });

  it('consent update and quick-reply delete on B rows succeed', async () => {
    expect(await updateContactConsent(B_CONTACT, false, true)).toEqual({ success: true });
    expect(db.tables.contacts.find((c) => c.id === B_CONTACT)).toMatchObject({ opted_out: true });
    expect(await deleteQuickReply('qB')).toEqual({ success: true });
    expect(db.tables.quick_replies.map((q) => q.id)).toEqual(['qA']);
  });

  it("'contact:<own contact>' alias resolves to the workspace's own conversations only", async () => {
    expect(await updateConversationStatus(`contact:${B_CONTACT}`, 'snoozed')).toEqual({ success: true });
    expect(db.tables.conversations.find((c) => c.id === B_CONV)!.status).toBe('snoozed');
    expect(await updateConversationStatus(`contact:${A_CONTACT}`, 'snoozed')).toEqual(notFound);
  });
});

describe('failures are errors, not success', () => {
  it('a database error on the update is reported as an error', async () => {
    db.failTables.add('conversations');
    const r: any = await updateConversationStatus(B_CONV, 'closed');
    expect(r.success).not.toBe(true);
    expect(r.error).toBeTruthy();
  });
});
