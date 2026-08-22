import { inngest } from '@/lib/inngest';
import { GET as dispatchCampaignBatch } from '@/app/api/cron/workers/campaign-dispatch/route';
import { logger } from '@/shared/logger';

interface CampaignDispatchEventData {
  campaignId: string;
}

/**
 * Starts immediately after a user presses "Broadcast now". One invocation
 * owns at most the worker's normal 50-recipient batch, then emits another
 * durable Inngest event if work remains. Cron uses the exact same worker and
 * cannot duplicate work because acquire_campaign_jobs uses SKIP LOCKED.
 */
export const campaignDispatchFn = inngest.createFunction(
  {
    id: 'campaign-dispatch',
    retries: 3,
    name: 'Dispatch Email Campaign Immediately',
    triggers: { event: 'campaign/dispatch' },
  },
  async ({ event, step }) => {
    const { campaignId } = event.data as CampaignDispatchEventData;
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');

    const result = await step.run('dispatch-one-campaign-batch', async () => {
      const response = await dispatchCampaignBatch(new Request(
        `http://internal/api/cron/workers/campaign-dispatch?campaignId=${encodeURIComponent(campaignId)}`,
        { headers: { Authorization: `Bearer ${cronSecret}` } }
      ));
      if (!response.ok) throw new Error(`Campaign dispatch failed with HTTP ${response.status}`);
      return response.json() as Promise<{ processed: number; sent: number; remaining: number }>;
    });

    logger.info({ campaignId, ...result }, 'campaign.immediate_dispatch.batch_complete');
    if (result.remaining > 0) {
      await inngest.send({ name: 'campaign/dispatch', data: { campaignId } });
    }
    return result;
  }
);
