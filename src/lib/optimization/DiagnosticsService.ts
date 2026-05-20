/**
 * DiagnosticsService — records operational failures, automations errors,
 * payment warnings, and coordinates system telemetry aggregations.
 */

import { createClient } from '@/lib/supabase/client';

export interface DiagnosticsLog {
  id: string;
  form_id: string;
  error_type: 'runtime' | 'automation' | 'payment' | 'realtime' | 'persistence' | 'ai';
  message: string;
  source: string;
  metadata: any;
  created_at: string;
}

export const DiagnosticsService = {
  /**
   * Log a diagnostic error event to the database log file.
   */
  async logError(
    formId: string,
    type: DiagnosticsLog['error_type'],
    message: string,
    source: string,
    metadata: any = {}
  ): Promise<boolean> {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('form_diagnostics_logs')
        .insert({
          form_id: formId,
          error_type: type,
          message,
          source,
          metadata
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[DiagnosticsService] Logging error failed:', err);
      return false;
    }
  },

  /**
   * Fetch aggregate error counts grouped by category.
   */
  async getErrorMetrics(formId: string): Promise<Record<string, number>> {
    const supabase = createClient();
    try {
      const { data } = await supabase
        .from('form_diagnostics_logs')
        .select('error_type')
        .eq('form_id', formId);

      const counters: Record<string, number> = {
        runtime: 0,
        automation: 0,
        payment: 0,
        realtime: 0,
        persistence: 0,
        ai: 0
      };

      if (data) {
        data.forEach((row: any) => {
          if (row.error_type in counters) {
            counters[row.error_type]++;
          }
        });
      }

      return counters;
    } catch {
      return {};
    }
  },

  /**
   * Fetch recent diagnostic log items.
   */
  async getRecentLogs(formId: string, limit: number = 20): Promise<DiagnosticsLog[]> {
    const supabase = createClient();
    try {
      const { data } = await supabase
        .from('form_diagnostics_logs')
        .select('*')
        .eq('form_id', formId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return data || [];
    } catch {
      return [];
    }
  }
};
