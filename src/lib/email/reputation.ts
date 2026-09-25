import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/shared/logger';

/**
 * Sending-domain reputation. All managed domains share the platform Resend account, so one
 * workspace's bad list damages deliverability for everyone. A domain whose recent hard-bounce or
 * complaint rate crosses these thresholds is paused, and the send gate
 * (managedSender.checkManagedFromDomain) then refuses it.
 *
 * Thresholds follow the provider/mailbox guidance the platform account is judged by: providers
 * review accounts around 5% bounces and act on complaints well below 0.5%, and Gmail requires
 * bulk senders to stay under 0.3% spam complaints.
 */
export const REPUTATION_POLICY = {
  windowDays: 7,
  /** Below this many sends in the window the rates are too noisy to act on. */
  minSends: 100,
  maxHardBounceRate: 0.05,
  maxComplaintRate: 0.003,
};

export type ReputationPolicy = typeof REPUTATION_POLICY;

export interface DomainReputation {
  sent: number;
  hardBounces: number;
  complaints: number;
  hardBounceRate: number;
  complaintRate: number;
  breach: 'hard_bounce_rate' | 'complaint_rate' | null;
}

export async function getDomainReputation(
  db: SupabaseClient,
  senderDomainId: string,
  policy: ReputationPolicy = REPUTATION_POLICY,
): Promise<DomainReputation> {
  const since = new Date(Date.now() - policy.windowDays * 86_400_000).toISOString();
  const count = async (eventType: string, bounceType?: string) => {
    let q = db
      .from('email_tracking_logs')
      .select('id', { count: 'exact', head: true })
      .eq('sender_domain_id', senderDomainId)
      .eq('event_type', eventType)
      .gte('timestamp', since);
    if (bounceType) q = q.eq('bounce_type', bounceType);
    const { count: n, error } = await q;
    if (error) throw new Error(`reputation count failed: ${error.message}`);
    return n ?? 0;
  };

  const [sent, hardBounces, complaints] = await Promise.all([count('sent'), count('bounce', 'hard'), count('complaint')]);
  const hardBounceRate = sent ? hardBounces / sent : 0;
  const complaintRate = sent ? complaints / sent : 0;
  const breach =
    sent < policy.minSends
      ? null
      : hardBounceRate >= policy.maxHardBounceRate
        ? 'hard_bounce_rate'
        : complaintRate >= policy.maxComplaintRate
          ? 'complaint_rate'
          : null;
  return { sent, hardBounces, complaints, hardBounceRate, complaintRate, breach };
}

const pct = (r: number) => `${(r * 100).toFixed(2)}%`;

/** Re-evaluates a domain after a bounce/complaint and pauses it if a threshold is crossed. */
export async function evaluateDomainReputation(
  db: SupabaseClient,
  senderDomainId: string,
  policy: ReputationPolicy = REPUTATION_POLICY,
): Promise<DomainReputation & { paused: boolean }> {
  const rep = await getDomainReputation(db, senderDomainId, policy);
  if (!rep.breach) return { ...rep, paused: false };

  const reason =
    rep.breach === 'hard_bounce_rate'
      ? `hard-bounce rate ${pct(rep.hardBounceRate)} over the last ${policy.windowDays} days (limit ${pct(policy.maxHardBounceRate)})`
      : `complaint rate ${pct(rep.complaintRate)} over the last ${policy.windowDays} days (limit ${pct(policy.maxComplaintRate)})`;

  // Only the first breach sets the timestamp/reason; later events leave them alone.
  const { data, error } = await db
    .from('sender_domains')
    .update({ paused_at: new Date().toISOString(), pause_reason: reason })
    .eq('id', senderDomainId)
    .is('paused_at', null)
    .select('id, workspace_id, domain_name');
  if (error) throw new Error(`domain pause failed: ${error.message}`);
  if (data && data.length > 0) {
    logger.warn({ senderDomainId, workspaceId: data[0].workspace_id, domain: data[0].domain_name, ...rep }, 'email.domain.auto_paused');
  }
  return { ...rep, paused: true };
}
