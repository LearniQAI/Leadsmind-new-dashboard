import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({
  workspaceId: 'ws-1' as string | null,
  contactResult: { id: 'contact-1' } as any,
  conversationResult: { id: 'conv-1', isNew: true } as any,
}));

vi.mock('@/lib/auth', () => ({
  requireWorkspaceAccess: async () => ({ workspaceId: state.workspaceId, userId: 'u1' }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({}),
}));

vi.mock('@/lib/email/contactConversation', () => ({
  findOrCreateContactByEmail: async () => state.contactResult,
  findOrCreateEmailConversation: async () => state.conversationResult,
}));

import { startEmailConversation } from './composeEmail';

describe('startEmailConversation (Compose gap fix)', () => {
  beforeEach(() => {
    state.workspaceId = 'ws-1';
    state.contactResult = { id: 'contact-1' };
    state.conversationResult = { id: 'conv-1', isNew: true };
  });

  it('creates/reuses the contact + conversation for a valid address', async () => {
    const res = await startEmailConversation({ toEmail: '  Lead@Example.com  ' });
    expect(res).toEqual({ conversationId: 'conv-1', contactId: 'contact-1', isNewConversation: true });
  });

  it('rejects an invalid email address before touching the DB', async () => {
    const res: any = await startEmailConversation({ toEmail: 'not-an-email' });
    expect(res.error).toBeTruthy();
  });

  it('surfaces a contact-creation error', async () => {
    state.contactResult = { error: 'contact insert failed' };
    const res: any = await startEmailConversation({ toEmail: 'lead@example.com' });
    expect(res.error).toBe('contact insert failed');
  });

  it('surfaces a conversation-creation error', async () => {
    state.conversationResult = { error: 'conversation insert failed' };
    const res: any = await startEmailConversation({ toEmail: 'lead@example.com' });
    expect(res.error).toBe('conversation insert failed');
  });

  it('reports isNewConversation:false when reusing an existing conversation (no duplicate)', async () => {
    state.conversationResult = { id: 'conv-existing', isNew: false };
    const res: any = await startEmailConversation({ toEmail: 'lead@example.com' });
    expect(res.isNewConversation).toBe(false);
    expect(res.conversationId).toBe('conv-existing');
  });
});
