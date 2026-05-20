/**
 * AuditLogger — handles writing operational audit histories 
 * and loading activity feeds.
 */

import { createClient } from '@/lib/supabase/client';

export interface FormAuditLog {
  id: string;
  form_id: string;
  action: 'edit' | 'publish' | 'unpublish' | 'rollback' | 'ai_approval' | 'collab';
  actor: string;
  summary: string;
  details: any;
  created_at: string;
}

export const AuditLogger = {
  /**
   * Insert a new operational audit track entry.
   */
  async logAction(
    formId: string,
    action: FormAuditLog['action'],
    actor: string,
    summary: string,
    details: any = {}
  ): Promise<boolean> {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('form_audit_logs')
        .insert({
          form_id: formId,
          action,
          actor,
          summary,
          details
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[AuditLogger] Failed to log action:', err);
      return false;
    }
  },

  /**
   * Fetch complete logs timeline for a form.
   */
  async getTimeline(formId: string): Promise<FormAuditLog[]> {
    const supabase = createClient();
    try {
      const { data } = await supabase
        .from('form_audit_logs')
        .select('*')
        .eq('form_id', formId)
        .order('created_at', { ascending: false });
      return data || [];
    } catch {
      return [];
    }
  }
};
