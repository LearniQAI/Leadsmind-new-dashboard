// Gmail inbound sync (Conversations batch 5).
//
// Ongoing:  Pub/Sub push (/api/webhooks/gmail/push) or the cron safety net -> syncMailbox(): Gmail
//           history.list from the stored historyId cursor. If the cursor is too old (Gmail keeps
//           ~1 week of history -> 404) it recovers by listing mail since the last successful sync,
//           so downtime never silently loses messages.
// Import:   "Import existing conversations" -> an email_import_jobs row the cron worker pages through
//           (runImportJobs), counting first for a real "X of Y" progress figure. Resumable.
//
// Filing (both paths, decided with the product owner):
//   - one conversation per CONTACT (every other channel does the same); Gmail's threadId is stored per
//     message for reply threading;
//   - existing contact -> filed; unknown address -> a contact is created ONLY if the user has emailed
//     them from this mailbox (they sent this message, or Gmail has sent mail to them); everyone else
//     (newsletters, notifications, cold inbound) is skipped and counted;
//   - Spam / Trash / Drafts / Chats / Promotions / Social / Updates / Forums are always skipped;
//   - mail between teammates / the user's own addresses is internal and never filed;
//   - duplicates are the database's job (batch 3 unique indexes): the same email arriving via Resend,
//     a teammate's mailbox, a LeadsMind send (batch 4), or a re-run is stored once.

import { createAdminClient } from '@/lib/supabase/server';
import {
  hasGmailScope,
  getFreshCalendarAccessToken,
  syncWorkspaceCalendarIntegrationRow,
  toCalendarConnectionRow,
} from '@/lib/calendar/connections';
import { insertEmailMessage } from '@/lib/email/emailMessageStore';
import { findOrCreateContactByEmail, findOrCreateEmailConversation } from '@/lib/email/contactConversation';
import { INBOUND_EMAIL_DOMAIN } from '@/lib/email/inboundAddress';
import { parseGmailMessage, stripQuotedReply, type ParsedGmailMessage } from './parse';
import { logger } from '@/shared/logger';

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const REQUEST_TIMEOUT_MS = 15_000;
const SYNC_LEASE_MS = 90_000;

export const SKIP_LABELS = new Set([
  'SPAM', 'TRASH', 'DRAFT', 'CHAT',
  'CATEGORY_PROMOTIONS', 'CATEGORY_SOCIAL', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS',
]);

/** Gmail search used by imports and downtime recovery (mirrors SKIP_LABELS server-side). */
export const IMPORT_BASE_QUERY =
  '-in:spam -in:trash -in:drafts -in:chats -category:promotions -category:social -category:updates -category:forums';

export class GmailApiError extends Error {
  constructor(public status: number, message: string, public reason: string | null = null) {
    super(message);
  }
  get rateLimited() {
    return this.status === 429 || (this.status === 403 && /rateLimit|quota/i.test(this.reason || this.message));
  }
}

async function gmail(token: string, path: string, init: RequestInit = {}): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${GMAIL_API}${path}`, {
      ...init,
      headers: { ...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new GmailApiError(res.status, body?.error?.message || `Gmail API ${res.status}`, body?.error?.errors?.[0]?.reason || null);
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

// ---- mailbox context ------------------------------------------------------------------------

export interface MailboxContext {
  mailbox: { id: string; workspace_id: string; user_id: string | null; email_address: string; history_id: string | null };
  token: string;
  /** Addresses that are "us" in this workspace: teammates' logins + every connected mailbox. */
  internal: Set<string>;
  /** address -> has this mailbox ever sent to it (per run cache). */
  corresponded: Map<string, boolean>;
  /**
   * address -> contact id lookup, shared while in flight: messages are filed in parallel, and two
   * for the same new person must not both try to create the contact.
   */
  contacts: Map<string, Promise<string | null>>;
  /** Set for the history import: messages are stored as historical (no notification, not unread). */
  historical?: boolean;
}

/**
 * LeadsMind's own system addresses: workspace inbox aliases ({slug}@INBOUND_EMAIL_DOMAIN) and the
 * Email->SMS bridge. Mail to/from them is the app talking to itself, never a person to file under.
 */
const SYSTEM_DOMAINS = [INBOUND_EMAIL_DOMAIN.toLowerCase(), 'sms.leadsmind.io'];
export const isInternalAddress = (ctx: Pick<MailboxContext, 'internal'>, address: string) =>
  ctx.internal.has(address) || SYSTEM_DOMAINS.some((d) => address.endsWith(`@${d}`));

export async function loadMailboxContext(mailboxId: string): Promise<MailboxContext> {
  const admin = createAdminClient();
  const { data: mailbox } = await admin
    .from('email_mailboxes')
    .select('id, workspace_id, user_id, provider, email_address, history_id, connection_id')
    .eq('id', mailboxId)
    .maybeSingle();
  if (!mailbox || mailbox.provider !== 'gmail' || !mailbox.connection_id) throw new Error('mailbox is not connected');

  const { data: conn } = await admin
    .from('user_calendar_connections')
    .select('id, workspace_id, user_id, provider, status, credentials')
    .eq('id', mailbox.connection_id)
    .maybeSingle();
  if (!conn || conn.user_id !== mailbox.user_id || conn.status !== 'connected' || !hasGmailScope((conn.credentials as any)?.scope)) {
    throw new Error('Gmail needs to be reconnected');
  }
  const token = await getFreshCalendarAccessToken(toCalendarConnectionRow(conn));

  const internal = new Set<string>([mailbox.email_address.toLowerCase()]);
  const { data: mailboxes } = await admin.from('email_mailboxes').select('email_address').eq('workspace_id', mailbox.workspace_id);
  for (const m of mailboxes || []) internal.add(String(m.email_address).toLowerCase());
  const { data: members } = await admin.from('workspace_members').select('user_id').eq('workspace_id', mailbox.workspace_id);
  const ids = (members || []).map((m: any) => m.user_id).filter(Boolean);
  if (ids.length) {
    const { data: users } = await admin.from('users').select('email').in('id', ids);
    for (const u of users || []) if (u.email) internal.add(String(u.email).toLowerCase());
  }

  return { mailbox, token, internal, corresponded: new Map(), contacts: new Map() };
}

// ---- filing one message -----------------------------------------------------------------------

export type ImportOutcome = 'imported' | 'duplicate' | 'skipped';

async function hasSentTo(ctx: MailboxContext, address: string): Promise<boolean> {
  const cached = ctx.corresponded.get(address);
  if (cached !== undefined) return cached;
  const q = encodeURIComponent(`in:sent to:${address}`);
  const res = await gmail(ctx.token, `/messages?q=${q}&maxResults=1`);
  const hit = Array.isArray(res?.messages) && res.messages.length > 0;
  ctx.corresponded.set(address, hit);
  return hit;
}

async function resolveContact(ctx: MailboxContext, address: string, name: string | null, userSentThis: boolean): Promise<string | null> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('contacts')
    .select('id')
    .eq('workspace_id', ctx.mailbox.workspace_id)
    .eq('email', address)
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id;
  if (!userSentThis && !(await hasSentTo(ctx, address))) return null;
  const created = await findOrCreateContactByEmail(admin, ctx.mailbox.workspace_id, address, name);
  if ('error' in created) throw new Error(`contact create failed: ${created.error}`);
  return created.id;
}

async function contactFor(ctx: MailboxContext, address: string, name: string | null, userSentThis: boolean): Promise<string | null> {
  const inFlight = ctx.contacts.get(address);
  if (inFlight) {
    const id = await inFlight;
    // A "not corresponded" answer cached for an inbound message is overridden when the user
    // themselves sent this one.
    if (id || !userSentThis) return id;
  }
  const p = resolveContact(ctx, address, name, userSentThis);
  ctx.contacts.set(address, p);
  try {
    return await p;
  } catch (err) {
    ctx.contacts.delete(address);
    throw err;
  }
}

/** Files one Gmail message into the right contact conversation(s). */
export async function fileGmailMessage(ctx: MailboxContext, msg: ParsedGmailMessage): Promise<ImportOutcome> {
  if (msg.labelIds.some((l) => SKIP_LABELS.has(l))) return 'skipped';
  if (!msg.from) return 'skipped';

  const own = ctx.mailbox.email_address.toLowerCase();
  const outbound = msg.labelIds.includes('SENT') || msg.from.address === own;
  const counterparts = (outbound ? [...msg.to, ...msg.cc] : [msg.from])
    .filter((a, i, all) => all.findIndex((b) => b.address === a.address) === i)
    .filter((a) => !isInternalAddress(ctx, a.address));
  if (!counterparts.length) return 'skipped';

  const admin = createAdminClient();
  let outcome: ImportOutcome = 'skipped';
  let first = true;
  const body = stripQuotedReply(msg.text || '') || msg.subject || '(no content)';

  for (const person of counterparts) {
    const contactId = await contactFor(ctx, person.address, person.name ?? null, outbound);
    if (!contactId) continue;
    const conv = await findOrCreateEmailConversation(admin, ctx.mailbox.workspace_id, contactId, person.name || person.address, msg.date);
    if ('error' in conv) throw new Error(`conversation create failed: ${conv.error}`);

    const res = await insertEmailMessage(admin, {
      workspaceId: ctx.mailbox.workspace_id,
      conversationId: conv.id,
      direction: outbound ? 'outbound' : 'inbound',
      text: body,
      html: msg.html,
      subject: msg.subject,
      from: msg.from,
      to: msg.to,
      cc: msg.cc,
      messageId: msg.messageId,
      inReplyTo: msg.inReplyTo,
      references: msg.references,
      mailboxId: ctx.mailbox.id,
      providerThreadId: msg.threadId,
      // The (mailbox, gmail id) unique key holds one row per mailbox message; when one sent email
      // goes to several contacts, the other threads dedupe on Message-ID instead.
      providerMessageId: first ? msg.id : null,
      status: outbound ? 'sent' : 'delivered',
      sentAt: msg.date,
      metadata: { source: ctx.historical ? 'gmail_import' : 'gmail_sync' },
      historicalImport: !!ctx.historical,
    });
    first = false;

    if (res.status === 'inserted') {
      outcome = 'imported';
      if (msg.attachments.length) {
        const { error } = await admin.from('message_attachments').insert(
          msg.attachments.map((a) => ({
            workspace_id: ctx.mailbox.workspace_id,
            message_id: res.id,
            filename: a.filename,
            content_type: a.contentType,
            size_bytes: a.sizeBytes,
            storage_path: null,
            provider_attachment_id: a.attachmentId,
            content_id: a.contentId,
            is_inline: a.isInline,
          })),
        );
        if (error) logger.warn({ err: error, messageId: res.id }, 'gmail.sync.attachments_insert_failed');
      }
    } else if (outcome !== 'imported') {
      outcome = 'duplicate';
    }
  }
  return outcome;
}

async function fetchAndFile(ctx: MailboxContext, gmailId: string): Promise<ImportOutcome> {
  let resource: any;
  try {
    resource = await gmail(ctx.token, `/messages/${encodeURIComponent(gmailId)}?format=full`);
  } catch (err) {
    if (err instanceof GmailApiError && err.status === 404) return 'skipped'; // deleted since
    throw err;
  }
  return fileGmailMessage(ctx, parseGmailMessage(resource));
}

// ---- watch (Pub/Sub) ------------------------------------------------------------------------

export const pubsubTopic = () => process.env.GMAIL_PUBSUB_TOPIC || null;

/**
 * Starts / renews the Gmail push watch (INBOX + SENT) when Pub/Sub is configured, and makes sure the
 * mailbox has a history cursor either way (without Pub/Sub the cron worker polls from it).
 */
export async function ensureWatch(mailboxId: string): Promise<{ watching: boolean }> {
  const admin = createAdminClient();
  const ctx = await loadMailboxContext(mailboxId);
  const topic = pubsubTopic();
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  let startHistoryId: string | null = null;

  if (topic) {
    const res = await gmail(ctx.token, '/watch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicName: topic, labelIds: ['INBOX', 'SENT'], labelFilterBehavior: 'INCLUDE' }),
    });
    patch.watch_expires_at = res?.expiration ? new Date(Number(res.expiration)).toISOString() : null;
    startHistoryId = res?.historyId ? String(res.historyId) : null;
  }
  if (!ctx.mailbox.history_id) {
    if (!startHistoryId) startHistoryId = String((await gmail(ctx.token, '/profile'))?.historyId || '') || null;
    // Ongoing sync starts now; older mail is the explicit import's job.
    if (startHistoryId) {
      patch.history_id = startHistoryId;
      patch.last_synced_at = new Date().toISOString();
    }
  }
  await admin.from('email_mailboxes').update(patch).eq('id', mailboxId);
  return { watching: !!topic };
}

/** Best-effort: stop push notifications before a disconnect. */
export async function stopWatch(token: string): Promise<void> {
  try {
    await gmail(token, '/stop', { method: 'POST' });
  } catch (err) {
    logger.warn({ err }, 'gmail.watch.stop_failed');
  }
}

// ---- incremental sync ---------------------------------------------------------------------------

const bigger = (a: string | null, b: string | null) => {
  if (!a) return b;
  if (!b) return a;
  return BigInt(a) >= BigInt(b) ? a : b;
};

export interface SyncResult {
  status: 'synced' | 'partial' | 'busy' | 'initialized' | 'recovered' | 'error';
  imported: number;
  duplicates: number;
  skipped: number;
  error?: string;
}

async function acquireSyncLease(mailboxId: string): Promise<boolean> {
  const admin = createAdminClient();
  const now = new Date();
  const { data } = await admin
    .from('email_mailboxes')
    .update({ sync_locked_until: new Date(now.getTime() + SYNC_LEASE_MS).toISOString() })
    .eq('id', mailboxId)
    .not('connection_id', 'is', null)
    .or(`sync_locked_until.is.null,sync_locked_until.lt.${now.toISOString()}`)
    .select('id');
  return !!data?.length;
}

/**
 * Pulls everything new since the mailbox's history cursor. Safe to call from the push webhook and the
 * cron at the same time (lease). Advances the cursor only past history it fully processed, so a
 * budget cut-off or crash resumes where it stopped.
 */
export async function syncMailbox(mailboxId: string, opts: { budgetMs: number }): Promise<SyncResult> {
  const started = Date.now();
  const startedIso = new Date(started).toISOString();
  const admin = createAdminClient();
  const result: SyncResult = { status: 'synced', imported: 0, duplicates: 0, skipped: 0 };
  const tally = (o: ImportOutcome) => {
    if (o === 'imported') result.imported++;
    else if (o === 'duplicate') result.duplicates++;
    else result.skipped++;
  };

  if (!(await acquireSyncLease(mailboxId))) return { ...result, status: 'busy' };

  let ctx: MailboxContext;
  try {
    ctx = await loadMailboxContext(mailboxId);
  } catch (err: any) {
    const { data: mb } = await admin.from('email_mailboxes').select('workspace_id').eq('id', mailboxId).maybeSingle();
    if (mb) await syncWorkspaceCalendarIntegrationRow(mb.workspace_id, 'gmail').catch(() => {});
    await admin.from('email_mailboxes').update({ sync_locked_until: null, last_sync_error: String(err?.message || err) }).eq('id', mailboxId);
    return { ...result, status: 'error', error: String(err?.message || err) };
  }

  const finish = async (patch: Record<string, any>) => {
    // Clear the push flag only if no newer push arrived while this sync ran.
    await admin.from('email_mailboxes').update({ ...patch, sync_locked_until: null }).eq('id', mailboxId);
    await admin.from('email_mailboxes').update({ sync_requested_at: null }).eq('id', mailboxId).lte('sync_requested_at', startedIso);
  };

  try {
    if (!ctx.mailbox.history_id) {
      const profile = await gmail(ctx.token, '/profile');
      await finish({ history_id: String(profile.historyId), last_synced_at: startedIso, last_sync_error: null });
      return { ...result, status: 'initialized' };
    }

    const startId = ctx.mailbox.history_id; // constant across pages of one history.list query
    let cursor = startId; // advanced only past fully processed history records
    let pageToken: string | undefined;
    let latest: string | null = null;
    let cutOff = false;

    do {
      let page: any;
      try {
        page = await gmail(
          ctx.token,
          `/history?startHistoryId=${startId}&historyTypes=messageAdded&maxResults=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`,
        );
      } catch (err) {
        if (err instanceof GmailApiError && err.status === 404) {
          // Cursor older than Gmail's history window: recover from the last good sync time.
          return await recoverFromGap(ctx, mailboxId, opts.budgetMs - (Date.now() - started), result, finish, startedIso);
        }
        throw err;
      }
      latest = bigger(latest, page?.historyId ? String(page.historyId) : null);

      for (const record of page?.history || []) {
        if (Date.now() - started > opts.budgetMs) {
          cutOff = true;
          break;
        }
        for (const added of record.messagesAdded || []) {
          if (added?.message?.id) tally(await fetchAndFile(ctx, added.message.id));
        }
        cursor = bigger(cursor, String(record.id)) as string;
      }
      pageToken = cutOff ? undefined : page?.nextPageToken;
    } while (pageToken);

    const done = !cutOff;
    await finish({
      history_id: done ? bigger(cursor, latest) : cursor,
      last_synced_at: startedIso,
      last_sync_error: null,
      ...(done ? {} : { sync_requested_at: new Date().toISOString() }),
    });
    return { ...result, status: done ? 'synced' : 'partial' };
  } catch (err: any) {
    logger.error({ err, mailboxId }, 'gmail.sync.failed');
    await admin.from('email_mailboxes').update({ sync_locked_until: null, last_sync_error: String(err?.message || err) }).eq('id', mailboxId);
    return { ...result, status: 'error', error: String(err?.message || err) };
  }
}

async function recoverFromGap(
  ctx: MailboxContext,
  mailboxId: string,
  budgetMs: number,
  result: SyncResult,
  finish: (patch: Record<string, any>) => Promise<void>,
  startedIso: string,
): Promise<SyncResult> {
  const admin = createAdminClient();
  const { data: mb } = await admin.from('email_mailboxes').select('last_synced_at').eq('id', mailboxId).single();
  // One hour of overlap: duplicates are free (unique indexes), gaps are not.
  const sinceMs = (mb?.last_synced_at ? new Date(mb.last_synced_at).getTime() : Date.now() - 7 * 86_400_000) - 3_600_000;
  const profile = await gmail(ctx.token, '/profile');
  const started = Date.now();
  const q = encodeURIComponent(`after:${Math.floor(sinceMs / 1000)} ${IMPORT_BASE_QUERY}`);
  let pageToken: string | undefined;
  do {
    const page = await gmail(ctx.token, `/messages?q=${q}&maxResults=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`);
    for (const m of page?.messages || []) {
      if (Date.now() - started > budgetMs) {
        // Keep the old cursor so the next run recovers again from the same point.
        await finish({ last_sync_error: null, sync_requested_at: new Date().toISOString() });
        return { ...result, status: 'partial' };
      }
      const o = await fetchAndFile(ctx, m.id);
      if (o === 'imported') result.imported++;
      else if (o === 'duplicate') result.duplicates++;
      else result.skipped++;
    }
    pageToken = page?.nextPageToken;
  } while (pageToken);
  await finish({ history_id: String(profile.historyId), last_synced_at: startedIso, last_sync_error: null });
  logger.warn({ mailboxId, imported: result.imported }, 'gmail.sync.recovered_from_history_gap');
  return { ...result, status: 'recovered' };
}

// ---- "Import existing conversations" ---------------------------------------------------------

export const IMPORT_RANGES = { '30': 30, '90': 90, '365': 365, all: null } as const;
export type ImportRange = keyof typeof IMPORT_RANGES;

export function importQuery(since: Date | null): string {
  return `${since ? `after:${Math.floor(since.getTime() / 1000)} ` : ''}${IMPORT_BASE_QUERY}`;
}

export async function startImport(params: { workspaceId: string; userId: string; mailboxId: string; range: ImportRange }) {
  const admin = createAdminClient();
  const days = IMPORT_RANGES[params.range];
  const since = days === null ? null : new Date(Date.now() - days * 86_400_000);
  const { data, error } = await admin
    .from('email_import_jobs')
    .insert({
      workspace_id: params.workspaceId,
      mailbox_id: params.mailboxId,
      requested_by: params.userId,
      status: 'counting',
      since: since ? since.toISOString() : null,
      query: importQuery(since),
      total_messages: 0,
    })
    .select('*')
    .single();
  if (error) {
    if ((error as any).code === '23505') throw new Error('An import is already running for this mailbox');
    throw error;
  }
  return data;
}

// Messages per committed page (each page = one resume point). Env-overridable for ops / testing.
const IMPORT_PAGE_SIZE = Math.min(100, Math.max(1, Number(process.env.GMAIL_IMPORT_PAGE_SIZE) || 25));
const IMPORT_CONCURRENCY = 5;
const IMPORT_LEASE_MS = 90_000;

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }));
  return out;
}

/**
 * Advances one import job for up to `budgetMs`. Counting phase: pages ids only to get an exact total.
 * Importing phase: one page of 25 at a time; the page's counters and the NEXT page token are committed
 * together, so an interruption re-does at most one page (which dedupes).
 */
export async function runImportJob(jobId: string, budgetMs: number): Promise<{ status: string }> {
  const admin = createAdminClient();
  const started = Date.now();
  const now = new Date();
  const { data: leased } = await admin
    .from('email_import_jobs')
    .update({ locked_until: new Date(now.getTime() + IMPORT_LEASE_MS).toISOString(), updated_at: now.toISOString() })
    .eq('id', jobId)
    .in('status', ['counting', 'importing'])
    .or(`locked_until.is.null,locked_until.lt.${now.toISOString()}`)
    .select('*');
  const job = leased?.[0];
  if (!job) return { status: 'busy' };

  // Writes only while the job is still active: a user's Cancel mid-run wins, and returns false here so
  // the loop stops instead of reviving / completing a cancelled job.
  const save = async (patch: Record<string, any>): Promise<boolean> => {
    const { data } = await admin
      .from('email_import_jobs')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', jobId)
      .in('status', ['counting', 'importing'])
      .select('id');
    return !!data?.length;
  };

  let ctx: MailboxContext;
  try {
    ctx = await loadMailboxContext(job.mailbox_id);
  } catch (err: any) {
    await save({ status: 'failed', last_error: String(err?.message || err), locked_until: null, finished_at: new Date().toISOString() });
    return { status: 'failed' };
  }
  ctx.historical = true;
  if (!job.started_at) await save({ started_at: new Date().toISOString() });

  const q = encodeURIComponent(job.query);
  let state = { ...job };
  try {
    while (Date.now() - started < budgetMs) {
      if (state.status === 'counting') {
        const page = await gmail(ctx.token, `/messages?q=${q}&maxResults=500&fields=messages/id,nextPageToken${state.page_token ? `&pageToken=${encodeURIComponent(state.page_token)}` : ''}`);
        const total = (state.total_messages || 0) + (page?.messages?.length || 0);
        state = page?.nextPageToken
          ? { ...state, total_messages: total, page_token: page.nextPageToken }
          : { ...state, total_messages: total, page_token: null, status: 'importing' };
        if (!(await save({ total_messages: state.total_messages, page_token: state.page_token, status: state.status }))) {
          return { status: 'cancelled' };
        }
        continue;
      }

      const page = await gmail(ctx.token, `/messages?q=${q}&maxResults=${IMPORT_PAGE_SIZE}${state.page_token ? `&pageToken=${encodeURIComponent(state.page_token)}` : ''}`);
      const ids: string[] = (page?.messages || []).map((m: any) => m.id);
      const counts = { imported: 0, duplicates: 0, skipped: 0, errors: 0 };
      let lastErr: string | null = null;
      let rateLimited = false;
      await mapLimit(ids, IMPORT_CONCURRENCY, async (id) => {
        try {
          const o = await fetchAndFile(ctx, id);
          if (o === 'imported') counts.imported++;
          else if (o === 'duplicate') counts.duplicates++;
          else counts.skipped++;
        } catch (err: any) {
          if (err instanceof GmailApiError && err.rateLimited) rateLimited = true;
          counts.errors++;
          lastErr = String(err?.message || err);
        }
      });
      if (rateLimited) {
        // Don't commit a page that hit Gmail's rate limit: the whole page is retried next tick.
        await save({ last_error: 'Gmail rate limit reached — continuing shortly', locked_until: null });
        return { status: 'rate_limited' };
      }
      state = {
        ...state,
        processed: state.processed + ids.length,
        imported: state.imported + counts.imported,
        duplicates: state.duplicates + counts.duplicates,
        skipped: state.skipped + counts.skipped,
        errors: state.errors + counts.errors,
        page_token: page?.nextPageToken || null,
      };
      const complete = !page?.nextPageToken;
      const stillActive = await save({
        processed: state.processed,
        imported: state.imported,
        duplicates: state.duplicates,
        skipped: state.skipped,
        errors: state.errors,
        page_token: state.page_token,
        ...(lastErr ? { last_error: lastErr } : {}),
        ...(complete ? { status: 'completed', finished_at: new Date().toISOString(), locked_until: null } : {}),
      });
      if (!stillActive) return { status: 'cancelled' };
      if (complete) return { status: 'completed' };
    }
    await save({ locked_until: null });
    return { status: state.status };
  } catch (err: any) {
    logger.error({ err, jobId }, 'gmail.import.page_failed');
    const transient = err instanceof GmailApiError ? err.rateLimited || err.status >= 500 : err?.name === 'AbortError';
    await save(transient
      ? { last_error: String(err?.message || err), locked_until: null }
      : { status: 'failed', last_error: String(err?.message || err), locked_until: null, finished_at: new Date().toISOString() });
    return { status: transient ? 'retry' : 'failed' };
  }
}

/** The caller's own live Gmail mailbox in this workspace (imports are always for your own mailbox). */
export async function ownLiveMailbox(workspaceId: string, userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('email_mailboxes')
    .select('id, email_address')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('provider', 'gmail')
    .not('connection_id', 'is', null)
    .limit(1)
    .maybeSingle();
  return data;
}
