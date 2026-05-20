/**
 * VersionManager — handles form snapshotting, rollbacks, and comparison scaffolding.
 */

import { createClient } from '@/lib/supabase/client';

export interface FormVersion {
  id: string;
  form_id: string;
  version_number: number;
  snapshot: any;
  notes: string;
  created_at: string;
  created_by: string;
}

export const VersionManager = {
  /**
   * Create an immutable snapshot of the form.
   */
  async createSnapshot(
    formId: string,
    snapshotData: any,
    notes: string,
    actor: string
  ): Promise<{ success: boolean; version?: FormVersion; error?: string }> {
    const supabase = createClient();

    try {
      // Find latest version number
      const { data: latest } = await supabase
        .from('form_versions')
        .select('version_number')
        .eq('form_id', formId)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVerNum = (latest?.[0]?.version_number || 0) + 1;

      const { data, error } = await supabase
        .from('form_versions')
        .insert({
          form_id: formId,
          version_number: nextVerNum,
          snapshot: snapshotData,
          notes,
          created_by: actor
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, version: data };
    } catch (err: any) {
      return { success: false, error: err.message || 'Snapshot creation failed.' };
    }
  },

  /**
   * Rollback draft state to a previous version snapshot.
   */
  async rollbackToVersion(
    formId: string,
    versionNumber: number
  ): Promise<{ success: boolean; snapshot?: any; error?: string }> {
    const supabase = createClient();

    try {
      const { data: version, error: fetchErr } = await supabase
        .from('form_versions')
        .select('snapshot')
        .eq('form_id', formId)
        .eq('version_number', versionNumber)
        .single();

      if (fetchErr || !version) {
        throw new Error('Requested version snapshot not found.');
      }

      // Overwrite the parent form configuration to match the snapshot
      const { error: updateErr } = await supabase
        .from('forms')
        .update({
          fields: version.snapshot.fields || [],
          config: version.snapshot.config || {}
        })
        .eq('id', formId);

      if (updateErr) throw updateErr;

      return { success: true, snapshot: version.snapshot };
    } catch (err: any) {
      return { success: false, error: err.message || 'Rollback execution failed.' };
    }
  },

  /**
   * Get complete version snapshot timeline.
   */
  async getVersionHistory(formId: string): Promise<FormVersion[]> {
    const supabase = createClient();
    try {
      const { data } = await supabase
        .from('form_versions')
        .select('*')
        .eq('form_id', formId)
        .order('version_number', { ascending: false });
      return data || [];
    } catch {
      return [];
    }
  }
};
