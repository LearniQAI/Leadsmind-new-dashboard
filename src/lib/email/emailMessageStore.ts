// Email message persistence for connected mailboxes (Gmail sync/send, later batches).
//
// Duplicate detection is done by the database, not by a select-then-insert: the unique index
// messages_conversation_rfc_message_id_key makes the SAME email (same Message-ID header) land once
// per conversation however many mailboxes deliver it (teammates CC'd on one email, sender and
// recipient both connected), and messages_mailbox_provider_message_id_key stops one mailbox's
// re-sync double-importing. A concurrent second insert gets 23505 and is reported as a duplicate.
// Content, subject and sender are never compared — two different emails always have different
// Message-IDs, so they can't false-positive.

export interface EmailAddress {
  address: string;
  name?: string | null;
}

/**
 * Bare Message-ID (no angle brackets, no whitespace), or null if the header is missing/unusable.
 * Case is preserved: the local part of a Message-ID is case-sensitive.
 */
export function normalizeMessageId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const bracketed = raw.match(/<([^<>\s]+)>/);
  const bare = (bracketed ? bracketed[1] : raw).trim();
  if (!bare || /[<>\s]/.test(bare)) return null;
  return bare;
}

/** References / In-Reply-To header -> ordered, de-duplicated bare Message-IDs (oldest first). */
export function parseMessageIdList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const ids = Array.from(raw.matchAll(/<([^<>\s]+)>/g), (m) => m[1]);
  const list = ids.length ? ids : raw.split(/\s+/).map((s) => normalizeMessageId(s)).filter((s): s is string => !!s);
  return Array.from(new Set(list));
}

export interface EmailMessageInsert {
  workspaceId: string;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  /** Plain-text body (messages.content is NOT NULL; every existing UI renders it). */
  text: string;
  html?: string | null;
  subject?: string | null;
  from: EmailAddress;
  to?: EmailAddress[];
  cc?: EmailAddress[];
  messageId?: string | null;
  inReplyTo?: string | null;
  references?: string | string[] | null;
  mailboxId?: string | null;
  providerThreadId?: string | null;
  providerMessageId?: string | null;
  status?: 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  sentAt?: string | null;
  metadata?: Record<string, any>;
}

export type EmailMessageInsertResult =
  | { status: 'inserted'; id: string }
  | { status: 'duplicate'; id: string | null; matchedOn: 'rfc_message_id' | 'provider_message_id' };

const RFC_DUP_INDEX = 'messages_conversation_rfc_message_id_key';
const PROVIDER_DUP_INDEX = 'messages_mailbox_provider_message_id_key';

const cleanAddresses = (list?: EmailAddress[]) =>
  (list || [])
    .filter((a) => a && typeof a.address === 'string' && a.address.trim())
    .map((a) => ({ address: a.address.trim().toLowerCase(), name: a.name?.trim() || null }));

export function buildEmailMessageRow(input: EmailMessageInsert): Record<string, any> {
  const references = Array.isArray(input.references)
    ? Array.from(new Set(input.references.map((r) => normalizeMessageId(r)).filter((r): r is string => !!r)))
    : parseMessageIdList(input.references ?? null);

  return {
    workspace_id: input.workspaceId,
    conversation_id: input.conversationId,
    direction: input.direction,
    content: input.text ?? '',
    html_body: input.html ?? null,
    subject: input.subject ?? null,
    sender_handle: input.from.address.trim().toLowerCase(),
    email_from_address: input.from.address.trim().toLowerCase(),
    email_from_name: input.from.name?.trim() || null,
    email_to: cleanAddresses(input.to),
    email_cc: cleanAddresses(input.cc),
    rfc_message_id: normalizeMessageId(input.messageId),
    in_reply_to: normalizeMessageId(input.inReplyTo),
    email_references: references.length ? references : null,
    mailbox_id: input.mailboxId ?? null,
    provider_thread_id: input.providerThreadId ?? null,
    provider_message_id: input.providerMessageId ?? null,
    status: input.status ?? (input.direction === 'inbound' ? 'delivered' : 'sent'),
    sent_at: input.sentAt ?? new Date().toISOString(),
    metadata: input.metadata ?? {},
  };
}

/**
 * Inserts an email message, or reports it as a duplicate of one already stored. Uses the caller's
 * client (admin for sync workers; RLS-checked for a user-initiated send).
 */
export async function insertEmailMessage(supabase: any, input: EmailMessageInsert): Promise<EmailMessageInsertResult> {
  const row = buildEmailMessageRow(input);
  const { data, error } = await supabase.from('messages').insert(row).select('id').single();
  if (!error && data) return { status: 'inserted', id: data.id };

  if (error?.code === '23505') {
    const text = `${error.message || ''} ${error.details || ''}`;
    if (text.includes(RFC_DUP_INDEX) && row.rfc_message_id) {
      const { data: existing } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', row.conversation_id)
        .eq('rfc_message_id', row.rfc_message_id)
        .maybeSingle();
      return { status: 'duplicate', id: existing?.id ?? null, matchedOn: 'rfc_message_id' };
    }
    if (text.includes(PROVIDER_DUP_INDEX) && row.mailbox_id && row.provider_message_id) {
      const { data: existing } = await supabase
        .from('messages')
        .select('id')
        .eq('mailbox_id', row.mailbox_id)
        .eq('provider_message_id', row.provider_message_id)
        .maybeSingle();
      return { status: 'duplicate', id: existing?.id ?? null, matchedOn: 'provider_message_id' };
    }
  }
  throw error ?? new Error('email message insert failed');
}
