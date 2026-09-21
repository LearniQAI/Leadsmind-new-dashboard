export type SegmentDependent = {
  kind: 'email_campaign' | 'auto_sender' | 'sms_campaign' | 'whatsapp_campaign';
  id: string;
  name: string;
  status: string;
};

export const DEPENDENT_KIND_LABEL: Record<SegmentDependent['kind'], string> = {
  email_campaign: 'Email campaign',
  auto_sender: 'Auto-sender',
  sms_campaign: 'SMS broadcast',
  whatsapp_campaign: 'WhatsApp broadcast',
};

// Things that can still send (or be re-evaluated) using the segment. Finished/cancelled one-off
// campaigns are history: their audience was already resolved, so they are not listed.
const LIVE_BROADCAST_STATUSES = ['draft', 'scheduled', 'sending'];

/**
 * Everything in the workspace that currently references `segmentId`: email campaigns and
 * auto-senders (email_campaigns.segment JSON), SMS and WhatsApp broadcasts (segment_id FK).
 * Throws on a query error — the caller must not treat "could not check" as "no dependents".
 */
export async function findSegmentDependents(supabase: any, workspaceId: string, segmentId: string): Promise<SegmentDependent[]> {
  const [email, sms, wa] = await Promise.all([
    supabase
      .from('email_campaigns')
      .select('id, name, status, segment')
      .eq('workspace_id', workspaceId)
      .eq('segment->>segmentId', segmentId),
    supabase
      .from('bulk_sms_campaigns')
      .select('id, name, status')
      .eq('workspace_id', workspaceId)
      .eq('segment_id', segmentId)
      .in('status', LIVE_BROADCAST_STATUSES),
    supabase
      .from('whatsapp_broadcast_campaigns')
      .select('id, name, status')
      .eq('workspace_id', workspaceId)
      .eq('segment_id', segmentId)
      .in('status', LIVE_BROADCAST_STATUSES),
  ]);
  for (const r of [email, sms, wa]) if (r.error) throw r.error;

  const out: SegmentDependent[] = [];
  for (const c of email.data ?? []) {
    const automated = !!c.segment?.is_automated;
    if (c.status === 'cancelled') continue;
    if (!automated && c.status === 'sent') continue;
    out.push({ kind: automated ? 'auto_sender' : 'email_campaign', id: c.id, name: c.name, status: c.status });
  }
  for (const c of sms.data ?? []) out.push({ kind: 'sms_campaign', id: c.id, name: c.name, status: c.status });
  for (const c of wa.data ?? []) out.push({ kind: 'whatsapp_campaign', id: c.id, name: c.name, status: c.status });
  return out;
}
