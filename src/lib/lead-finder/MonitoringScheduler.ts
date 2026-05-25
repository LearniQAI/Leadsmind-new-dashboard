import { createServerClient } from '@/lib/supabase/server';
import { LeadChangeDetector, LeadState } from './LeadChangeDetector';
import { AlertPriorityEngine } from './AlertPriorityEngine';

export class MonitoringScheduler {
  /**
   * Intended to be run via a Cron Job (e.g., Supabase Edge Functions or Vercel Cron).
   * Fetches active watchlists, checks for changes in underlying leads, and generates alerts.
   */
  public static async runScheduledMonitoring() {
    const supabase = await createServerClient();
    
    // 1. Fetch active watchlists
    const { data: watchlists } = await supabase
      .from('lead_watchlists')
      .select('*')
      .eq('is_active', true);

    if (!watchlists || watchlists.length === 0) return;

    for (const watchlist of watchlists) {
      // In a real implementation, you would query Google/Enrichment providers 
      // based on the watchlist criteria to see if new leads exist or existing leads changed.
      // For this MVP, we simulate processing changes for existing leads in the DB that match criteria.

      // Mock: we just fetch recent leads
      const { data: leads } = await supabase
        .from('lead_finder_results')
        .select('*')
        .limit(5); // limit for simulation
      
      if (!leads) continue;

      for (const lead of leads) {
        // Simulate a state change for demonstration purposes.
        // In reality, we compare freshly fetched data against DB data.
        const oldState: LeadState = {
          rating: lead.rating,
          review_count: lead.review_count - 15, // Mock previous lower count
          website: undefined, // Mock previously missing website
          lead_score: lead.lead_score - 15, // Mock previous lower score
          qualification_status: lead.qualification_status
        };

        const newState: LeadState = {
          rating: lead.rating,
          review_count: lead.review_count,
          website: lead.website,
          lead_score: lead.lead_score,
          qualification_status: lead.qualification_status
        };

        const changes = LeadChangeDetector.detectChanges(oldState, newState);

        for (const change of changes) {
          const priority = AlertPriorityEngine.evaluatePriority(change, lead.lead_score);

          // Insert Alert
          await supabase.from('lead_alerts').insert({
            user_id: watchlist.user_id,
            watchlist_id: watchlist.id,
            result_id: lead.id,
            title: `Detected ${change.event_type.replace('_', ' ')}`,
            description: `Changed from ${change.previous_value} to ${change.new_value}`,
            priority
          });

          // Insert Change Event
          await supabase.from('lead_change_events').insert({
            result_id: lead.id,
            event_type: change.event_type,
            severity: change.severity,
            previous_value: change.previous_value,
            new_value: change.new_value
          });
        }
      }

      // Update last run
      await supabase.from('lead_watchlists').update({ last_run_at: new Date().toISOString() }).eq('id', watchlist.id);
    }
  }
}
