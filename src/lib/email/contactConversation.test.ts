import { describe, it, expect } from 'vitest';
import { findOrCreateContactByEmail, findOrCreateEmailConversation } from './contactConversation';

// Minimal fake Supabase client — a recursive query-builder stub (chainable
// .eq()/.limit() to any depth, terminating in .maybeSingle()) plus .insert()/
// .update(), enough surface for the two functions under test, shared by the
// real inbound webhook path and the new Compose action.
function fakeClient(opts: {
  existingContact?: { id: string } | null;
  existingConversation?: { id: string } | null;
  insertContactResult?: { data?: any; error?: any };
  insertConversationResult?: { data?: any; error?: any };
}) {
  const calls: any[] = [];

  function queryChain(resultData: any) {
    const node: any = {
      eq: () => node,
      limit: () => node,
      maybeSingle: async () => ({ data: resultData }),
    };
    return node;
  }

  return {
    calls,
    client: {
      from: (table: string) => ({
        select: () => queryChain(table === 'contacts' ? opts.existingContact : opts.existingConversation),
        insert: (payload: any) => {
          calls.push({ table, op: 'insert', payload });
          return {
            select: () => ({
              single: async () =>
                table === 'contacts'
                  ? opts.insertContactResult || { data: { id: 'new-contact-1' } }
                  : opts.insertConversationResult || { data: { id: 'new-conv-1' } },
            }),
          };
        },
        update: (payload: any) => {
          calls.push({ table, op: 'update', payload });
          return { eq: async () => ({ error: null }) };
        },
      }),
    },
  };
}

describe('findOrCreateContactByEmail', () => {
  it('returns the existing contact without creating a new one', async () => {
    const { client, calls } = fakeClient({ existingContact: { id: 'contact-1' } });
    const res = await findOrCreateContactByEmail(client, 'ws-1', 'Jane@Example.com');
    expect(res).toEqual({ id: 'contact-1' });
    expect(calls.filter((c) => c.op === 'insert')).toHaveLength(0);
  });

  it('normalizes the email to lowercase/trimmed before creating a contact', async () => {
    const { client, calls } = fakeClient({ existingContact: null });
    await findOrCreateContactByEmail(client, 'ws-1', '  Jane@Example.com  ', 'Jane Doe');
    const insertCall = calls.find((c) => c.table === 'contacts' && c.op === 'insert');
    expect(insertCall.payload).toMatchObject({ email: 'jane@example.com', first_name: 'Jane Doe', source: 'email' });
  });

  it('falls back to "Email User" when no name is given', async () => {
    const { client, calls } = fakeClient({ existingContact: null });
    await findOrCreateContactByEmail(client, 'ws-1', 'stranger@example.com');
    const insertCall = calls.find((c) => c.table === 'contacts' && c.op === 'insert');
    expect(insertCall.payload.first_name).toBe('Email User');
  });

  it('surfaces a DB error instead of throwing', async () => {
    const { client } = fakeClient({ existingContact: null, insertContactResult: { data: null, error: { message: 'boom' } } });
    const res = await findOrCreateContactByEmail(client, 'ws-1', 'x@example.com');
    expect(res).toEqual({ error: 'boom' });
  });
});

describe('findOrCreateEmailConversation', () => {
  it('returns the existing conversation and bumps last_message_at, marked isNew:false', async () => {
    const { client, calls } = fakeClient({ existingConversation: { id: 'conv-1' } });
    const res = await findOrCreateEmailConversation(client, 'ws-1', 'contact-1');
    expect(res).toEqual({ id: 'conv-1', isNew: false });
    expect(calls.some((c) => c.table === 'conversations' && c.op === 'update')).toBe(true);
  });

  it('creates a new platform:email conversation with no external_thread_id, marked isNew:true', async () => {
    const { client, calls } = fakeClient({ existingConversation: null });
    const res = await findOrCreateEmailConversation(client, 'ws-1', 'contact-1', 'Jane Doe');
    expect(res).toEqual({ id: 'new-conv-1', isNew: true });
    const insertCall = calls.find((c) => c.table === 'conversations' && c.op === 'insert');
    expect(insertCall.payload).toMatchObject({ platform: 'email', contact_id: 'contact-1', title: 'Jane Doe' });
    expect(insertCall.payload.external_thread_id).toBeUndefined();
  });

  it('surfaces a DB error instead of throwing', async () => {
    const { client } = fakeClient({ existingConversation: null, insertConversationResult: { data: null, error: { message: 'boom' } } });
    const res = await findOrCreateEmailConversation(client, 'ws-1', 'contact-1');
    expect(res).toEqual({ error: 'boom' });
  });
});
