import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/shared/logger';

// A campaign is finished when it has queue rows and none of them can still be sent. Marking it
// 'sent' used to be a single best-effort step at the end of a worker batch that ignored its own
// query errors: one transient failure left a fully-sent campaign "scheduled"/"sending" forever,
// because later runs only look at campaigns that still have due rows. Now the close step retries,
// and every worker run also reconciles — so a missed close is corrected on the next run.

const NOT_FINISHED = ['pending', 'processing', 'deferred'];
const RETRY_DELAYS_MS = [300, 1200];

async function withRetry<T>(what: string, fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < RETRY_DELAYS_MS.length) await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`${what} failed`);
}

/** Closes one campaign if it is finished. Throws on a query error (the caller retries). */
async function closeIfFinishedOnce(db: SupabaseClient, campaignId: string, now: Date): Promise<'closed' | 'open' | 'skipped'> {
  const { count: open, error: openErr } = await db
    .from('campaign_dispatch_queue')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .in('status', NOT_FINISHED);
  if (openErr) throw new Error(`open-row count failed: ${openErr.message}`);
  if ((open ?? 0) > 0) return 'open';

  const { count: total, error: totalErr } = await db
    .from('campaign_dispatch_queue')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId);
  if (totalErr) throw new Error(`row count failed: ${totalErr.message}`);
  // No rows at all is not "finished" (e.g. an auto-sender waiting for its first contact).
  if ((total ?? 0) === 0) return 'skipped';

  // Guarded transition: only a 'scheduled' campaign becomes 'sent' (never a draft or a re-send).
  const { error: updErr } = await db
    .from('email_campaigns')
    .update({ status: 'sent', sent_at: now.toISOString() })
    .eq('id', campaignId)
    .eq('status', 'scheduled');
  if (updErr) throw new Error(`status update failed: ${updErr.message}`);
  return 'closed';
}

/** End-of-batch close for the campaigns a worker batch touched. Retries; never throws. */
export async function closeFinishedCampaigns(db: SupabaseClient, campaignIds: string[], now = new Date()) {
  const results: Record<string, string> = {};
  for (const id of campaignIds) {
    try {
      results[id] = await withRetry(`close campaign ${id}`, () => closeIfFinishedOnce(db, id, now));
    } catch (err) {
      // The emails are already sent; reconcileFinishedCampaigns corrects this on a later run.
      logger.error({ err, campaignId: id }, 'campaign.close.failed_will_reconcile');
      results[id] = 'error';
    }
  }
  return results;
}

/**
 * Safety net: finds 'scheduled' campaigns that are actually finished (all queue rows terminal) and
 * marks them 'sent'. Scoped to `campaignIds` when given (a targeted run), else the whole queue (a
 * cron run), a bounded number per pass.
 */
export async function reconcileFinishedCampaigns(db: SupabaseClient, opts: { campaignIds?: string[]; limit?: number } = {}) {
  const now = new Date();
  let q = db
    .from('email_campaigns')
    .select('id')
    .eq('status', 'scheduled')
    .or(`scheduled_for.is.null,scheduled_for.lte.${now.toISOString()}`)
    .order('created_at', { ascending: true })
    .limit(opts.limit ?? 100);
  if (opts.campaignIds?.length) q = q.in('id', opts.campaignIds);
  const { data, error } = await q;
  if (error) {
    logger.error({ err: error }, 'campaign.reconcile.lookup_failed');
    return {};
  }
  const results = await closeFinishedCampaigns(db, (data ?? []).map((c: any) => c.id), now);
  const closed = Object.entries(results).filter(([, r]) => r === 'closed').map(([id]) => id);
  if (closed.length) logger.info({ closed }, 'campaign.reconcile.closed');
  return results;
}
