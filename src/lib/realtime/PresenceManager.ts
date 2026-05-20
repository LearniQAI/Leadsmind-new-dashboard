/**
 * PresenceManager — tracks editor and viewer heartbeat registrations,
 * current section context focus, and removes dead sessions.
 */

import { createClient } from '@/lib/supabase/client';
import { RealtimeEventBridge } from './RealtimeEventBridge';

export interface PresenceUser {
  email: string;
  client_id: string;
  is_editor: boolean;
  editing_section: string | null;
  last_active_at: string;
}

export const PresenceManager = {
  /**
   * Register a user heartbeat session.
   */
  async heartbeat(
    formId: string,
    email: string,
    clientId: string,
    isEditor: boolean,
    editingSection: string | null
  ): Promise<boolean> {
    const supabase = createClient();
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('form_presence')
        .upsert(
          {
            form_id: formId,
            user_email: email,
            client_id: clientId,
            is_editor: isEditor,
            editing_section: editingSection,
            last_active_at: now
          },
          { onConflict: 'form_id,user_email' }
        );

      if (error) throw error;

      // Broadcast presence state refresh event
      await RealtimeEventBridge.broadcast(formId, 'presence_update', {
        email,
        clientId,
        isEditor,
        editingSection
      });

      return true;
    } catch (err) {
      console.error('[PresenceManager] Heartbeat failed:', err);
      return false;
    }
  },

  /**
   * Fetch active session roster. Cleans up dead sessions.
   */
  async getActiveSessions(formId: string): Promise<PresenceUser[]> {
    const supabase = createClient();
    const expiryLimit = new Date(Date.now() - 30 * 1000).toISOString();

    try {
      // 1. Purge expired database sessions
      await supabase
        .from('form_presence')
        .delete()
        .eq('form_id', formId)
        .lt('last_active_at', expiryLimit);

      // 2. Load active participants
      const { data } = await supabase
        .from('form_presence')
        .select('user_email, client_id, is_editor, editing_section, last_active_at')
        .eq('form_id', formId);

      return (data || []).map((p: any) => ({
        email: p.user_email,
        client_id: p.client_id,
        is_editor: p.is_editor,
        editing_section: p.editing_section,
        last_active_at: p.last_active_at
      }));
    } catch {
      return [];
    }
  },

  /**
   * Clean up presence registration on tab close / exit.
   */
  async exitSession(formId: string, email: string) {
    const supabase = createClient();
    try {
      await supabase
        .from('form_presence')
        .delete()
        .eq('form_id', formId)
        .eq('user_email', email);

      await RealtimeEventBridge.broadcast(formId, 'presence_exit', { email });
    } catch (err) {
      console.error('[PresenceManager] Exit cleanup failed:', err);
    }
  }
};
