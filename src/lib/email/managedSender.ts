import { createHmac, timingSafeEqual } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { EmailRateLimitError, EmailSendError } from './errors';

/**
 * LeadsMind-managed sending: a workspace sends through the PLATFORM's Resend account, from a
 * domain it verified there (sender_domains). The platform key itself never leaves this module and
 * sendEmail. What getWorkspaceEmailConfig hands callers instead is a signed, workspace-bound
 * sender token in the `apiKey` slot. Every caller forwards `apiKey` untouched, so the token
 * reaches sendEmail. There it is verified, and the From domain is re-checked at send time
 * against that workspace's verified, un-paused domains. A caller that swaps in another From
 * address, or a forged/tampered token, fails closed.
 */

const TOKEN_PREFIX = 'lm_managed.';

function tokenSecret(): string {
  const secret = process.env.ENCRYPTION_KEY;
  // No fallback secret: a guessable default would let anyone mint a sender token.
  if (!secret) throw new EmailSendError('Email delivery is unavailable: server signing key is not configured.');
  return secret;
}

const mac = (workspaceId: string) =>
  createHmac('sha256', tokenSecret()).update(`managed-sender:${workspaceId}`).digest('hex');

export function signManagedSenderToken(workspaceId: string): string {
  return `${TOKEN_PREFIX}${workspaceId}.${mac(workspaceId)}`;
}

export function isManagedSenderToken(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.startsWith(TOKEN_PREFIX);
}

/** Returns the workspace id the token was issued for, or null if it is not authentic. */
export function verifyManagedSenderToken(token: string): string | null {
  if (!isManagedSenderToken(token)) return null;
  const body = token.slice(TOKEN_PREFIX.length);
  const dot = body.lastIndexOf('.');
  if (dot <= 0) return null;
  const workspaceId = body.slice(0, dot);
  const given = Buffer.from(body.slice(dot + 1), 'hex');
  const expected = Buffer.from(mac(workspaceId), 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected) ? workspaceId : null;
}

export const domainOfAddress = (address: string) => address.trim().split('@').pop()?.toLowerCase().replace(/>$/, '') ?? '';

export interface ManagedSenderDomain {
  id: string;
  domain_name: string;
  status: string;
  paused_at: string | null;
  pause_reason: string | null;
  hourly_send_limit: number | null;
}

/**
 * The send gate for managed sending. Returns the domain row when `fromAddress` is on a domain this
 * workspace verified in the platform account and that is not paused; otherwise a user-safe reason.
 */
export async function checkManagedFromDomain(
  db: SupabaseClient,
  workspaceId: string,
  fromAddress: string,
): Promise<{ ok: true; domain: ManagedSenderDomain } | { ok: false; reason: string }> {
  const domainName = domainOfAddress(fromAddress);
  if (!domainName) return { ok: false, reason: 'A From address on your verified sending domain is required.' };

  const { data, error } = await db
    .from('sender_domains')
    .select('id, domain_name, status, paused_at, pause_reason, hourly_send_limit')
    .eq('workspace_id', workspaceId)
    .eq('domain_name', domainName)
    .maybeSingle();
  if (error) throw new Error(`sending-domain lookup failed: ${error.message}`);

  if (!data) {
    return { ok: false, reason: `'${domainName}' is not a sending domain of this workspace. Add and verify it in Settings › Domains.` };
  }
  if (data.status !== 'verified') {
    return { ok: false, reason: `'${domainName}' is not verified yet. Finish its DNS setup in Settings › Domains.` };
  }
  if (data.paused_at) {
    return {
      ok: false,
      reason: `Sending from '${domainName}' is paused to protect deliverability${data.pause_reason ? ` (${data.pause_reason})` : ''}. Contact support to review it.`,
    };
  }
  return { ok: true, domain: data as ManagedSenderDomain };
}

// Send rate limits (managed sending only: BYO keys send on the customer's own Resend account and
// reputation). A workspace can override its own row in email_sending_limits only via the service
// role; there is deliberately no client write policy.
export const DEFAULT_WORKSPACE_HOURLY_LIMIT = 200;
export const DEFAULT_WORKSPACE_DAILY_LIMIT = 2000;
export const DEFAULT_DOMAIN_HOURLY_LIMIT = 200;

function nextWindowStart(window: string, now = new Date()): Date {
  const d = new Date(now);
  if (window === 'day') {
    d.setUTCHours(24, 0, 0, 0);
  } else {
    d.setUTCMinutes(60, 0, 0);
  }
  return d;
}

/** Atomically claims one send against the workspace hour/day and domain hour quotas. */
export async function claimSendQuota(db: SupabaseClient, workspaceId: string, domain: ManagedSenderDomain): Promise<void> {
  const { data: limits } = await db
    .from('email_sending_limits')
    .select('hourly_limit, daily_limit')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  const { data: blocked, error } = await db.rpc('claim_email_send_quota', {
    p_scopes: [`ws:${workspaceId}`, `ws:${workspaceId}`, `domain:${domain.id}`],
    p_windows: ['hour', 'day', 'hour'],
    p_limits: [
      limits?.hourly_limit ?? DEFAULT_WORKSPACE_HOURLY_LIMIT,
      limits?.daily_limit ?? DEFAULT_WORKSPACE_DAILY_LIMIT,
      domain.hourly_send_limit ?? DEFAULT_DOMAIN_HOURLY_LIMIT,
    ],
  });
  // Fail closed: if the counter can't be read, do not send uncounted mail on the shared account.
  if (error) throw new Error(`send quota check failed: ${error.message}`);
  if (blocked) {
    const window = String(blocked).split('|').pop() ?? 'hour';
    const retryAt = nextWindowStart(window);
    const what = String(blocked).startsWith('domain:') ? `'${domain.domain_name}'` : 'this workspace';
    throw new EmailRateLimitError(
      `Sending limit reached for ${what} (${window === 'day' ? 'daily' : 'hourly'}). Sending resumes at ${retryAt.toISOString()}.`,
      retryAt,
      String(blocked),
    );
  }
}

/** Writes the 'sent' event that later webhook events (by provider message id) attribute back to. */
export async function recordSentEvent(
  db: SupabaseClient,
  e: {
    workspaceId: string;
    senderDomainId: string | null;
    provider: string;
    messageId: string;
    recipient: string;
    tags?: { name: string; value: string }[];
  },
): Promise<void> {
  const tag = (name: string) => e.tags?.find((t) => t.name === name)?.value ?? null;
  const uuidOrNull = (v: string | null) => (v && /^[0-9a-f-]{36}$/i.test(v) ? v : null);
  const { error } = await db.from('email_tracking_logs').insert({
    workspace_id: e.workspaceId,
    event_type: 'sent',
    provider: e.provider,
    provider_message_id: e.messageId,
    recipient: e.recipient.toLowerCase(),
    sender_domain_id: e.senderDomainId,
    campaign_id: uuidOrNull(tag('campaign_id')),
    workflow_id: uuidOrNull(tag('workflow_id')),
    contact_id: uuidOrNull(tag('contact_id')),
  });
  if (error) throw new Error(`sent-event insert failed: ${error.message}`);
}
