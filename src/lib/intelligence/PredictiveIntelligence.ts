import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';

export const PredictiveIntelligence = {
  /**
   * Evaluates historical contact open patterns across a rolling 90-day time matrix.
   * Returns the hour (0-23) at which the contact opens emails most frequently.
   * Defaults to 9 (9:00 AM) if no history is found.
   */
  async evaluateHistoricalOpens(contactId: string, workspaceId: string): Promise<number> {
    const supabase = createAdminClient();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    try {
      const { data: logs, error } = await supabase
        .from('email_tracking_logs')
        .select('timestamp')
        .eq('contact_id', contactId)
        .eq('event_type', 'open')
        .gte('timestamp', ninetyDaysAgo.toISOString());

      if (error) {
        logger.warn({ err: error.message }, 'predictive_intelligence.query_tracking_logs.failed_using_default');
        return 9;
      }

      if (!logs || logs.length === 0) {
        return 9; // Fallback to 9 AM
      }

      const hourCounts: Record<number, number> = {};
      for (const log of logs) {
        if (!log.timestamp) continue;
        const date = new Date(log.timestamp);
        const hour = date.getHours(); // Evaluated in the context runtime timezone
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }

      let optimalHour = 9;
      let maxCount = -1;
      for (const [hourStr, count] of Object.entries(hourCounts)) {
        const hour = parseInt(hourStr, 10);
        if (count > maxCount) {
          maxCount = count;
          optimalHour = hour;
        }
      }

      return optimalHour;
    } catch (err: any) {
      logger.error({ err: err.message }, 'predictive_intelligence.evaluate_historical_opens.failed_using_default');
      return 9;
    }
  },

  /**
   * Integrates the EskomSePush API to retrieve active power disruptions for the contact's area.
   * Shifts delivery forward if there is an overlap with a load-shedding block.
   */
  async getOptimizedSendTime(contact: any, baseDate: Date): Promise<Date> {
    // 1. Determine optimal hour
    const workspaceId = contact.workspace_id;
    const optimalHour = await this.evaluateHistoricalOpens(contact.id, workspaceId);

    // 2. Set targeted send slot
    const targetDate = new Date(baseDate);
    targetDate.setHours(optimalHour, 0, 0, 0);

    // If the optimal hour today is already in the past, schedule for tomorrow
    if (targetDate.getTime() <= baseDate.getTime()) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    // 3. Resolve Eskom Area ID
    const areaId = contact.load_shedding_area || contact.region || contact.timezone || null;

    if (!areaId) {
      logger.info({ contactId: contact.id, scheduledAt: targetDate.toISOString() }, 'predictive_intelligence.load_shedding_area.unresolved');
      return targetDate;
    }

    // 4. Fetch EskomSePush events
    let events: any[] = [];
    const eskomToken = process.env.ESKOM_API_KEY || process.env.ESKOM_TOKEN;

    if (!eskomToken || eskomToken === 'mock_key' || eskomToken.includes('PLACEHOLDER') || areaId === 'mock-shedding-area') {
      logger.info({ areaId }, 'predictive_intelligence.mock_mode.active');
      // Simulate an overlapping load shedding event: starts 30 mins before targetDate, ends 2.5 hours later
      const mockStart = new Date(targetDate.getTime() - 30 * 60 * 1000);
      const mockEnd = new Date(targetDate.getTime() + 150 * 60 * 1000);
      events = [
        {
          start: mockStart.toISOString(),
          end: mockEnd.toISOString(),
          note: 'Stage 2 Mock Load Shedding'
        }
      ];
    } else {
      try {
        const res = await fetch(`https://api.sepush.co.za/business/2.0/area?id=${areaId}`, {
          headers: {
            'token': eskomToken
          }
        });
        if (res.ok) {
          const data = await res.json();
          events = data.events || [];
        } else {
          logger.warn({ status: res.status }, 'predictive_intelligence.eskomsepush.non_ok_status');
        }
      } catch (err: any) {
        logger.error({ err: err.message }, 'predictive_intelligence.eskomsepush.fetch_failed');
      }
    }

    // 5. Shift send time forward if load shedding block overlaps
    let finalSendTime = new Date(targetDate);
    let adjusted = true;
    let iterations = 0;

    // Convert events to Date ranges and sort
    const parsedEvents = events
      .map((e: any) => ({
        start: new Date(e.start),
        end: new Date(e.end)
      }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    while (adjusted && iterations < 10) {
      adjusted = false;
      for (const event of parsedEvents) {
        // If finalSendTime falls inside the load-shedding block [start, end]
        if (finalSendTime >= event.start && finalSendTime <= event.end) {
          // Shift forward to the end of the block + 5 minutes buffer
          finalSendTime = new Date(event.end.getTime() + 5 * 60 * 1000);
          adjusted = true;
          iterations++;
          break; // restart check loop with new time
        }
      }
    }

    if (iterations > 0) {
      logger.info({ contactId: contact.id, iterations, finalSendTime: finalSendTime.toISOString() }, 'predictive_intelligence.send_time.shifted');
    }

    return finalSendTime;
  }
};
