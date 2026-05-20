// PartialSubmissionStore — handles database read/write actions for partial submissions
import { createClient } from '@/lib/supabase/client';

export interface SavePartialPayload {
  stepId: string;
  values: Record<string, any>;
  completionPercentage: number;
  email?: string;
  recoveryToken?: string;
  recoveryTokenExpiresAt?: Date;
  metadata?: any;
}

export const PartialSubmissionStore = {
  /**
   * Save or update a partial submission in the database
   */
  async savePartial(
    formId: string,
    sessionId: string,
    payload: SavePartialPayload,
    customClient?: any
  ): Promise<{ success: boolean; data?: any; error?: any }> {
    const supabase = customClient || createClient();

    try {
      const dbPayload = {
        form_id: formId,
        session_id: sessionId,
        field_values: payload.values,
        current_step_id: payload.stepId,
        completion_percentage: payload.completionPercentage,
        email: payload.email || null,
        recovery_token: payload.recoveryToken || null,
        recovery_token_expires_at: payload.recoveryTokenExpiresAt
          ? payload.recoveryTokenExpiresAt.toISOString()
          : null,
        metadata: payload.metadata || {},
      };

      // Perform upsert based on (form_id, session_id) constraint
      const { data, error } = await supabase
        .from('form_partial_submissions')
        .upsert(dbPayload, { onConflict: 'form_id,session_id' })
        .select()
        .single();

      if (error) {
        console.error('[PartialSubmissionStore] Save error:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (err) {
      console.error('[PartialSubmissionStore] Unexpected save error:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Load partial submission by form and session ID
   */
  async loadPartialBySession(
    formId: string,
    sessionId: string,
    customClient?: any
  ): Promise<any | null> {
    const supabase = customClient || createClient();
    try {
      const { data, error } = await supabase
        .from('form_partial_submissions')
        .select('*')
        .eq('form_id', formId)
        .eq('session_id', sessionId)
        .maybeSingle();

      if (error) {
        console.error('[PartialSubmissionStore] Load error:', error);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  },

  /**
   * Load partial submission by recovery token (used on recovery resume endpoints)
   */
  async loadPartialByToken(
    token: string,
    customClient?: any
  ): Promise<any | null> {
    const supabase = customClient || createClient();
    try {
      const { data, error } = await supabase
        .from('form_partial_submissions')
        .select('*')
        .eq('recovery_token', token)
        .gt('recovery_token_expires_at', new Date().toISOString())
        .maybeSingle();

      if (error) {
        console.error('[PartialSubmissionStore] Token load error:', error);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  },

  /**
   * Delete partial submission once completed
   */
  async deletePartial(
    formId: string,
    sessionId: string,
    customClient?: any
  ): Promise<void> {
    const supabase = customClient || createClient();
    try {
      await supabase
        .from('form_partial_submissions')
        .delete()
        .eq('form_id', formId)
        .eq('session_id', sessionId);
    } catch (err) {
      console.error('[PartialSubmissionStore] Delete error:', err);
    }
  }
};
