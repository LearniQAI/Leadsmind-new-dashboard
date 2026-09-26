// Gmail send for the Conversations email channel (batch 4).
//
// Called ONLY through dispatchOutboundMessage() (inline first attempt from sendMessage() and the
// message-dispatch retry worker), so email gets the same retry queue / dead-letter treatment as
// Facebook / Instagram / WhatsApp.
//
// Ownership: the mailbox to send through is never read from the message row (members can edit it).
// The inline path resolves the SENDER's own mailbox; the worker uses the mailbox + sender recorded
// on the service-role-only queue row. Either way this module re-checks that the mailbox, its live
// OAuth connection and the sender are the same user, and refuses otherwise.

import { createAdminClient } from '@/lib/supabase/server';
import {
  hasGmailScope,
  getFreshCalendarAccessToken,
  markCalendarConnectionError,
  syncWorkspaceCalendarIntegrationRow,
  toCalendarConnectionRow,
} from '@/lib/calendar/connections';
import { normalizeMessageId } from '@/lib/email/emailMessageStore';
import { logger } from '@/shared/logger';

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const MAX_REFERENCES = 20;

export interface SenderMailbox {
  id: string;
  emailAddress: string;
}

/**
 * The signed-in sender's own healthy Gmail mailbox in this workspace, or null (-> the caller falls
 * back to the existing Resend inbox-address path). "Healthy" = a live connection that belongs to
 * the same user, is status 'connected', and still carries the Gmail scope.
 */
export async function resolveSenderGmailMailbox(workspaceId: string, userId: string): Promise<SenderMailbox | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('email_mailboxes')
    .select('id, email_address, user_id, connection:user_calendar_connections!email_mailboxes_connection_id_fkey(id, user_id, workspace_id, provider, status, credentials)')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('provider', 'gmail')
    .not('connection_id', 'is', null);

  for (const row of (data || []) as any[]) {
    const c = Array.isArray(row.connection) ? row.connection[0] : row.connection;
    if (
      c && c.user_id === userId && c.workspace_id === workspaceId && c.provider === 'gmail' &&
      c.status === 'connected' && hasGmailScope(c.credentials?.scope)
    ) {
      return { id: row.id, emailAddress: row.email_address };
    }
  }
  return null;
}

// ---- RFC 5322 message -----------------------------------------------------------------------

/** Header values can never carry CR/LF (header injection). */
const headerSafe = (v: string) => v.replace(/[\r\n]+/g, ' ').trim();

/** RFC 2047 encoded-word for non-ASCII header text. */
export function encodeHeaderWord(value: string): string {
  const safe = headerSafe(value);
  return /^[\x20-\x7e]*$/.test(safe) ? safe : `=?UTF-8?B?${Buffer.from(safe, 'utf8').toString('base64')}?=`;
}

function formatAddress(address: string, name?: string | null): string {
  const addr = headerSafe(address);
  if (!name || !headerSafe(name)) return addr;
  const n = headerSafe(name);
  const display = /^[\x20-\x7e]*$/.test(n) ? `"${n.replace(/["\\]/g, '\\$&')}"` : encodeHeaderWord(n);
  return `${display} <${addr}>`;
}

export interface RawEmailInput {
  from: { address: string; name?: string | null };
  to: { address: string; name?: string | null };
  subject: string;
  text: string;
  messageId: string; // bare
  inReplyTo?: string | null; // bare
  references?: string[]; // bare, oldest first
  date?: Date;
}

/** Plain-text RFC 5322 message; body base64 so any characters / line lengths are safe. */
export function buildRawEmail(input: RawEmailInput): string {
  const headers = [
    `From: ${formatAddress(input.from.address, input.from.name)}`,
    `To: ${formatAddress(input.to.address, input.to.name)}`,
    `Subject: ${encodeHeaderWord(input.subject)}`,
    `Date: ${(input.date || new Date()).toUTCString()}`,
    `Message-ID: <${headerSafe(input.messageId)}>`,
  ];
  if (input.inReplyTo) headers.push(`In-Reply-To: <${headerSafe(input.inReplyTo)}>`);
  const refs = (input.references || []).map(headerSafe).filter(Boolean);
  if (refs.length) headers.push(`References: ${refs.map((r) => `<${r}>`).join(' ')}`);
  headers.push('MIME-Version: 1.0', 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: base64');

  const body = Buffer.from(input.text || '', 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n');
  return `${headers.join('\r\n')}\r\n\r\n${body}\r\n`;
}

export const toBase64Url = (s: string) =>
  Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** "Re: Re: FW: x" -> "Re: x" */
export function replySubject(base: string): string {
  const stripped = base.replace(/^\s*((re|fw|fwd)\s*:\s*)+/i, '').trim();
  return stripped ? `Re: ${stripped}` : 'Re:';
}

/** Deterministic per message, so a retry can find an earlier attempt that did reach Gmail. */
export const outboundMessageIdFor = (messageId: string) => `lm-${messageId}@leadsmind.io`;

// ---- Send -----------------------------------------------------------------------------------

export interface GmailSendResult {
  success: boolean;
  error?: string;
  errorType?: string;
  httpStatus?: number;
  failureClass?: 'recoverable' | 'permanent';
  /** Columns to write on the message after a successful send. */
  patch?: Record<string, any>;
}

const permanent = (error: string, errorType: string, httpStatus?: number): GmailSendResult =>
  ({ success: false, error, errorType, httpStatus, failureClass: 'permanent' });
const recoverable = (error: string, errorType: string, httpStatus?: number): GmailSendResult =>
  ({ success: false, error, errorType, httpStatus, failureClass: 'recoverable' });

/** Gmail HTTP failure -> recoverable (worth a retry) or permanent. */
export function classifyGmailHttpFailure(status: number, reason?: string | null): 'recoverable' | 'permanent' {
  if (status === 429 || status >= 500) return 'recoverable';
  if (status === 403 && reason && /^(rateLimitExceeded|userRateLimitExceeded|backendError)$/.test(reason)) return 'recoverable';
  return 'permanent';
}

async function gmailFetch(url: string, token: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      headers: { ...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function readMessageIdHeader(token: string, gmailId: string, timeoutMs: number): Promise<string | null> {
  try {
    const res = await gmailFetch(`${GMAIL_API}/messages/${encodeURIComponent(gmailId)}?format=metadata&metadataHeaders=Message-ID`, token, {}, timeoutMs);
    if (!res.ok) return null;
    const body = await res.json();
    const h = (body?.payload?.headers || []).find((x: any) => String(x?.name).toLowerCase() === 'message-id');
    return normalizeMessageId(h?.value);
  } catch {
    return null;
  }
}

export async function sendEmailViaGmail(params: {
  messageId: string;
  mailboxId: string | null;
  senderUserId: string | null;
  attemptNumber: number;
  timeoutMs: number;
}): Promise<GmailSendResult> {
  const { messageId, mailboxId, senderUserId, attemptNumber, timeoutMs } = params;
  const admin = createAdminClient();

  if (!mailboxId || !senderUserId) return permanent('No sending mailbox recorded for this message', 'mailbox_missing');

  const { data: message } = await admin
    .from('messages')
    .select('id, workspace_id, conversation_id, content, subject, direction')
    .eq('id', messageId)
    .maybeSingle();
  if (!message || message.direction !== 'outbound') return permanent('Message not found', 'message_missing');

  // --- Ownership: mailbox, connection and sender must all be the same user ---------------------
  const { data: mailbox } = await admin
    .from('email_mailboxes')
    .select('id, workspace_id, user_id, provider, email_address, connection_id')
    .eq('id', mailboxId)
    .maybeSingle();
  if (!mailbox || mailbox.provider !== 'gmail' || mailbox.workspace_id !== message.workspace_id) {
    return permanent('Sending mailbox not found in this workspace', 'mailbox_missing');
  }
  if (mailbox.user_id !== senderUserId) {
    logger.warn({ messageId, mailboxId, senderUserId, ownerId: mailbox.user_id }, 'gmail.send.mailbox_not_owned');
    return permanent('You can only send through your own connected mailbox', 'mailbox_not_owned');
  }
  if (!mailbox.connection_id) return permanent('This Gmail mailbox is disconnected — reconnect Gmail to send', 'mailbox_disconnected');

  const { data: connRow } = await admin
    .from('user_calendar_connections')
    .select('id, workspace_id, user_id, provider, status, credentials')
    .eq('id', mailbox.connection_id)
    .maybeSingle();
  if (!connRow || connRow.user_id !== senderUserId || connRow.provider !== 'gmail' || connRow.workspace_id !== message.workspace_id) {
    return permanent('You can only send through your own connected mailbox', 'mailbox_not_owned');
  }
  if (connRow.status !== 'connected' || !hasGmailScope((connRow.credentials as any)?.scope)) {
    return permanent('Gmail needs to be reconnected before it can send', 'gmail_reauth_required');
  }

  // --- Recipient + threading context -----------------------------------------------------------
  const { data: conv } = await admin
    .from('conversations')
    .select('id, contacts(email, first_name, last_name)')
    .eq('id', message.conversation_id)
    .maybeSingle();
  const contact: any = conv ? (Array.isArray((conv as any).contacts) ? (conv as any).contacts[0] : (conv as any).contacts) : null;
  if (!contact?.email) return permanent('No email address for contact', 'no_recipient');

  // Reply to the latest email in the conversation that has a Message-ID (from any path: Resend
  // inbound, Gmail, an earlier send) so the contact's mail client threads it.
  const { data: parent } = await admin
    .from('messages')
    .select('rfc_message_id, email_references, subject')
    .eq('conversation_id', message.conversation_id)
    .neq('id', message.id)
    .not('rfc_message_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  // Gmail's own thread id is per mailbox: only one THIS mailbox produced can be reused.
  const { data: threadRow } = await admin
    .from('messages')
    .select('provider_thread_id')
    .eq('conversation_id', message.conversation_id)
    .eq('mailbox_id', mailbox.id)
    .not('provider_thread_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let subject = (message.subject || '').trim();
  if (!subject) {
    const { data: lastSubject } = await admin
      .from('messages')
      .select('subject')
      .eq('conversation_id', message.conversation_id)
      .neq('id', message.id)
      .not('subject', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    subject = lastSubject?.subject ? replySubject(lastSubject.subject) : '';
  }
  const { data: sender } = await admin.from('users').select('first_name, last_name').eq('id', senderUserId).maybeSingle();
  const senderName = sender ? `${sender.first_name || ''} ${sender.last_name || ''}`.trim() : '';
  if (!subject) subject = senderName ? `Message from ${senderName}` : 'New message';

  const inReplyTo = parent?.rfc_message_id || null;
  const references = inReplyTo
    ? Array.from(new Set([...((parent?.email_references as string[] | null) || []), inReplyTo])).slice(-MAX_REFERENCES)
    : [];
  const ownMessageId = outboundMessageIdFor(message.id);
  const recipientName = [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim() || null;

  // --- Token -------------------------------------------------------------------------------------
  let token: string;
  try {
    token = await getFreshCalendarAccessToken(toCalendarConnectionRow(connRow));
  } catch (err) {
    logger.warn({ err, messageId, mailboxId }, 'gmail.send.token_refresh_failed');
    await syncWorkspaceCalendarIntegrationRow(message.workspace_id, 'gmail');
    return permanent('Gmail access was revoked or expired — reconnect Gmail to send', 'gmail_reauth_required');
  }

  const patchFor = (gmailId: string, threadId: string | null, rfc: string | null) => ({
    mailbox_id: mailbox.id,
    provider_message_id: gmailId,
    provider_thread_id: threadId,
    rfc_message_id: rfc || ownMessageId,
    in_reply_to: inReplyTo,
    email_references: references.length ? references : null,
    email_from_address: mailbox.email_address,
    email_from_name: senderName || null,
    email_to: [{ address: String(contact.email).toLowerCase(), name: recipientName }],
    subject,
    sender_handle: mailbox.email_address,
  });

  try {
    // --- Idempotency: a previous attempt may have reached Gmail but lost the response -------------
    if (attemptNumber > 1) {
      const q = encodeURIComponent(`rfc822msgid:${ownMessageId}`);
      const found = await gmailFetch(`${GMAIL_API}/messages?q=${q}&maxResults=1&includeSpamTrash=true`, token, {}, timeoutMs);
      if (found.ok) {
        const hit = (await found.json())?.messages?.[0];
        if (hit?.id) {
          logger.info({ messageId, gmailId: hit.id }, 'gmail.send.already_sent_skip');
          const rfc = await readMessageIdHeader(token, hit.id, timeoutMs);
          return { success: true, patch: patchFor(hit.id, hit.threadId || null, rfc) };
        }
      }
    }

    const raw = buildRawEmail({
      from: { address: mailbox.email_address, name: senderName || null },
      to: { address: contact.email, name: recipientName },
      subject,
      text: message.content || '',
      messageId: ownMessageId,
      inReplyTo,
      references,
    });
    const res = await gmailFetch(`${GMAIL_API}/messages/send`, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: toBase64Url(raw), ...(threadRow?.provider_thread_id ? { threadId: threadRow.provider_thread_id } : {}) }),
    }, timeoutMs);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const reason = body?.error?.errors?.[0]?.reason || body?.error?.status || null;
      const msg = body?.error?.message || `Gmail send failed (${res.status})`;
      if (res.status === 401) {
        await markCalendarConnectionError(connRow.id);
        await syncWorkspaceCalendarIntegrationRow(message.workspace_id, 'gmail');
        return permanent('Gmail rejected the connection — reconnect Gmail to send', 'gmail_reauth_required', 401);
      }
      const cls = classifyGmailHttpFailure(res.status, reason);
      return cls === 'recoverable'
        ? recoverable(msg, `gmail_http_${res.status}`, res.status)
        : permanent(msg, `gmail_http_${res.status}${reason ? `_${reason}` : ''}`, res.status);
    }

    const sent = await res.json();
    // Gmail may rewrite Message-ID; store what the recipient actually got so their reply's
    // In-Reply-To matches this row.
    const rfc = await readMessageIdHeader(token, sent.id, timeoutMs);
    return { success: true, patch: patchFor(sent.id, sent.threadId || null, rfc) };
  } catch (err: any) {
    const aborted = err?.name === 'AbortError';
    logger.warn({ err, messageId, aborted }, 'gmail.send.network_failure');
    return recoverable(aborted ? 'Gmail did not respond in time' : err?.message || 'Network error talking to Gmail', aborted ? 'timeout' : 'network');
  }
}

