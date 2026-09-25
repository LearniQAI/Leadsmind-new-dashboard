import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/shared/logger';
import { escapeLikePattern } from '@/lib/campaigns/emailSuppression';
import { evaluateDomainReputation, type ReputationPolicy, REPUTATION_POLICY } from './reputation';
import { markAddressInvalid, suppressEmail } from './suppression';
import type { NormalizedEmailEvent } from './provider/types';

/**
 * Applies one provider webhook event (already signature-verified and normalised) to our state.
 * Shared by /api/webhooks/email/deliverability and /api/webhooks/resend/inbound, which forwards
 * every non-inbound event here so one platform webhook (one signing secret) covers everything.
 */

export type EventOutcome =
  | 'processed'
  | 'duplicate'
  | 'ignored'
  | 'unattributed'
  | 'voice_note_click'
  | 'domain_updated';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuid = (v: string | null | undefined) => (v && UUID_RE.test(v) ? v : null);

interface Attribution {
  workspaceId: string;
  senderDomainId: string | null;
  campaignId: string | null;
  workflowId: string | null;
  contactId: string | null;
}

/**
 * Who the event belongs to. Prefer our own 'sent' row (keyed by the provider's message id); fall
 * back to the tags we set at send time (the event is signed, so they are ours), resolving the
 * workspace from our own campaign/workflow/workspace rows rather than trusting a tag blindly.
 */
async function attribute(db: SupabaseClient, e: NormalizedEmailEvent): Promise<Attribution | null> {
  if (e.messageId) {
    const { data: sent } = await db
      .from('email_tracking_logs')
      .select('workspace_id, sender_domain_id, campaign_id, workflow_id, contact_id')
      .eq('provider_message_id', e.messageId)
      .eq('event_type', 'sent')
      .limit(1)
      .maybeSingle();
    if (sent) {
      return {
        workspaceId: sent.workspace_id,
        senderDomainId: sent.sender_domain_id,
        campaignId: sent.campaign_id,
        workflowId: sent.workflow_id,
        contactId: sent.contact_id ?? uuid(e.tags.contact_id),
      };
    }
  }

  const campaignId = uuid(e.tags.campaign_id);
  const workflowId = uuid(e.tags.workflow_id);
  const tagWorkspace = uuid(e.tags.workspace_id);
  let workspaceId: string | null = null;
  if (campaignId) {
    workspaceId = (await db.from('email_campaigns').select('workspace_id').eq('id', campaignId).maybeSingle()).data?.workspace_id ?? null;
  } else if (workflowId) {
    workspaceId = (await db.from('workflows').select('workspace_id').eq('id', workflowId).maybeSingle()).data?.workspace_id ?? null;
  } else if (tagWorkspace) {
    workspaceId = (await db.from('workspaces').select('id').eq('id', tagWorkspace).maybeSingle()).data?.id ?? null;
  }
  if (!workspaceId) return null;

  let senderDomainId = uuid(e.tags.sender_domain_id);
  if (senderDomainId) {
    const { data } = await db.from('sender_domains').select('id').eq('id', senderDomainId).eq('workspace_id', workspaceId).maybeSingle();
    senderDomainId = data?.id ?? null;
  }
  return {
    workspaceId,
    senderDomainId,
    campaignId: campaignId,
    workflowId: campaignId ? null : workflowId,
    contactId: uuid(e.tags.contact_id),
  };
}

async function applySoftBounce(db: SupabaseClient, workspaceId: string, email: string) {
  const pattern = escapeLikePattern(email.trim());
  for (const table of ['contacts', 'crm_contacts']) {
    const { data: rows } = await db
      .from(table)
      .select('id, soft_bounce_count, consecutive_soft_bounces')
      .eq('workspace_id', workspaceId)
      .ilike('email', pattern);
    for (const c of rows ?? []) {
      const nextConsecutive = (c.consecutive_soft_bounces || 0) + 1;
      const nextTotal = (c.soft_bounce_count || 0) + 1;
      // Repeated soft bounces are delivery evidence the mailbox is not working.
      const invalid = nextConsecutive >= 3 || nextTotal >= 5;
      await db
        .from(table)
        .update({ soft_bounce_count: nextTotal, consecutive_soft_bounces: nextConsecutive, ...(invalid ? { is_invalid_email: true } : {}) })
        .eq('id', c.id);
    }
  }
}

export async function processEmailEvent(
  db: SupabaseClient,
  e: NormalizedEmailEvent,
  deps: {
    applyDomainUpdate?: (providerDomainId: string) => Promise<boolean>;
    recordVoiceNoteClick?: (url: string) => Promise<boolean>;
    reputationPolicy?: ReputationPolicy;
  } = {},
): Promise<EventOutcome> {
  if (e.domain) {
    const apply = deps.applyDomainUpdate ?? (async (id: string) => (await import('./sendingDomains')).applyProviderDomainUpdate(id));
    return (await apply(e.domain.id)) ? 'domain_updated' : 'ignored';
  }
  if (!e.type) return 'ignored';

  // Voice-note waveform clicks are tracked on the message itself (see voiceClickTracking.ts).
  if (e.type === 'click' && e.linkUrl) {
    const record = deps.recordVoiceNoteClick ?? (async (url: string) => (await import('@/lib/voicenotes/voiceClickTracking')).recordVoiceNoteClick(url));
    if (await record(e.linkUrl)) return 'voice_note_click';
  }

  const who = await attribute(db, e);
  if (!who) return 'unattributed';

  // Our own send already wrote the 'sent' row; the provider's copy adds nothing.
  if (e.type === 'sent' && e.messageId) {
    const { count } = await db
      .from('email_tracking_logs')
      .select('id', { count: 'exact', head: true })
      .eq('provider_message_id', e.messageId)
      .eq('event_type', 'sent');
    if (count) return 'duplicate';
  }

  const { error: insertError } = await db.from('email_tracking_logs').insert({
    workspace_id: who.workspaceId,
    campaign_id: who.campaignId,
    workflow_id: who.campaignId ? null : who.workflowId,
    contact_id: who.contactId,
    event_type: e.type,
    provider: e.provider,
    provider_event_id: e.eventId,
    provider_message_id: e.messageId,
    recipient: e.recipient?.toLowerCase() ?? null,
    sender_domain_id: who.senderDomainId,
    bounce_type: e.bounceType,
    link_url: e.linkUrl,
    user_agent: e.userAgent,
    ip_address: e.ipAddress,
    ...(e.occurredAt ? { timestamp: e.occurredAt } : {}),
  });
  if (insertError) {
    // Same svix id delivered again: already applied, so skip every side effect.
    if (insertError.code === '23505') return 'duplicate';
    throw new Error(`event insert failed: ${insertError.message}`);
  }

  if (who.campaignId && ['open', 'click', 'bounce', 'complaint'].includes(e.type)) {
    const { error } = await db.rpc('increment_campaign_metric', { c_id: who.campaignId, metric_name: e.type });
    if (error) logger.error({ err: error, campaignId: who.campaignId }, 'email.event.metric_increment.failed');
  }

  if (who.contactId && (e.type === 'open' || e.type === 'click')) {
    import('@/lib/intelligence/LeadScoringEngine')
      .then(({ LeadScoringEngine }) =>
        LeadScoringEngine.trackScoringEvent(who.contactId!, e.type as 'open' | 'click', {
          linkUrl: e.linkUrl ?? undefined,
          campaignId: who.campaignId ?? undefined,
        }),
      )
      .catch((err) => logger.error({ err, contactId: who.contactId }, 'email.event.scoring_trigger.failed'));
  }

  const recipient = e.recipient;
  if (recipient) {
    if (e.type === 'bounce' && e.bounceType === 'hard') {
      await markAddressInvalid(db, who.workspaceId, recipient);
      await suppressEmail(db, who.workspaceId, recipient, 'bounce', 'hard_bounce');
    } else if (e.type === 'bounce') {
      await applySoftBounce(db, who.workspaceId, recipient);
    } else if (e.type === 'complaint') {
      // A complaint is an opt-out, not a broken address.
      await suppressEmail(db, who.workspaceId, recipient, 'complaint', 'spam_complaint');
    } else if (e.type === 'suppressed') {
      // The provider will not deliver to this address from the shared platform account (it
      // bounced or complained somewhere before). Suppress it for this workspace so no send path
      // keeps retrying. Not marked invalid: the provider does not say the mailbox is broken.
      const detail = e.suppression?.type ? `${e.provider}:${e.suppression.type}` : `${e.provider}:suppressed`;
      await suppressEmail(db, who.workspaceId, recipient, 'provider_suppressed', detail);
    } else if (e.type === 'delivered') {
      const pattern = escapeLikePattern(recipient.trim());
      for (const table of ['contacts', 'crm_contacts']) {
        await db.from(table).update({ consecutive_soft_bounces: 0 }).eq('workspace_id', who.workspaceId).ilike('email', pattern);
      }
    }
  }

  if (who.senderDomainId && (e.type === 'bounce' || e.type === 'complaint')) {
    await evaluateDomainReputation(db, who.senderDomainId, deps.reputationPolicy ?? REPUTATION_POLICY);
  }
  return 'processed';
}
