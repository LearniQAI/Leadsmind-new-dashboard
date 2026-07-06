import { createServerClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';

export class DigestGenerator {
  /**
   * Intended to be run via a Cron Job (e.g., daily at 8AM).
   * Aggregates recent unread alerts and sends a structured email/digest summary.
   */
  public static async generateDailyDigest() {
    const supabase = await createServerClient();
    
    // 1. Fetch unread alerts from the last 24 hours
    const { data: alerts } = await supabase
      .from('lead_alerts')
      .select('*, lead:result_id(business_name, id), watchlist:watchlist_id(name)')
      .eq('is_read', false)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (!alerts || alerts.length === 0) return;

    // 2. Group by User ID
    const userDigests: Record<string, any[]> = {};
    for (const alert of alerts) {
      if (!userDigests[alert.user_id]) userDigests[alert.user_id] = [];
      userDigests[alert.user_id].push(alert);
    }

    // 3. Store Digest and (Simulate) Sending Email
    for (const [userId, userAlerts] of Object.entries(userDigests)) {
      const highPriority = userAlerts.filter(a => a.priority === 'High');
      const other = userAlerts.filter(a => a.priority !== 'High');

      const content = {
        total_alerts: userAlerts.length,
        high_priority_count: highPriority.length,
        summary: `You have ${highPriority.length} critical opportunities and ${other.length} standard updates.`
      };

      await supabase.from('alert_digests').insert({
        user_id: userId,
        digest_type: 'daily',
        content
      });

      // In production: trigger Resend / email API here.
      logger.info({ userId, totalAlerts: userAlerts.length }, 'digest_generator.digest.generated');
    }
  }
}
