/**
 * FeedbackCollector — records user bug reports, features suggestions,
 * and links session traces to database telemetry.
 */

import { createClient } from '@/lib/supabase/client';

export interface FeedbackSubmission {
  id: string;
  form_id: string;
  user_email: string;
  type: 'bug' | 'feature' | 'general';
  message: string;
  diagnostics: any;
  session_trace?: string;
  created_at: string;
}

export const FeedbackCollector = {
  /**
   * Submit a new feedback record.
   */
  async submitFeedback(
    formId: string,
    email: string,
    type: FeedbackSubmission['type'],
    message: string,
    diagnostics: any = {},
    sessionTrace?: string
  ): Promise<boolean> {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('form_beta_feedback')
        .insert({
          form_id: formId,
          user_email: email,
          type,
          message,
          diagnostics,
          session_trace: sessionTrace || null
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[FeedbackCollector] Submission failed:', err);
      return false;
    }
  },

  /**
   * Load submitted feedback timeline (admin logs view).
   */
  async getTimeline(formId: string): Promise<FeedbackSubmission[]> {
    const supabase = createClient();
    try {
      const { data } = await supabase
        .from('form_beta_feedback')
        .select('*')
        .eq('form_id', formId)
        .order('created_at', { ascending: false });

      return data || [];
    } catch {
      return [];
    }
  }
};
