/**
 * DraftRuntime — manages runtime schema separation between working builder drafts
 * and production-deployed public form snapshots.
 */

import { createClient } from '@/lib/supabase/client';

export interface RuntimeSchema {
  id: string;
  name: string;
  fields: any[];
  config: any;
  status: 'draft' | 'published';
  published_version?: number;
}

export const DraftRuntime = {
  /**
   * Fetches the correct schema version depending on client visibility context.
   * Public pages call this with isDraftMode = false.
   * Builder preview pages call this with isDraftMode = true.
   */
  async fetchRuntimeSchema(
    formId: string,
    isDraftMode = false
  ): Promise<{ success: boolean; schema?: RuntimeSchema; error?: string }> {
    const supabase = createClient();

    try {
      // 1. Fetch form metadata
      const { data: form, error: formErr } = await supabase
        .from('forms')
        .select('id, name, fields, config, status, published_version')
        .eq('id', formId)
        .single();

      if (formErr || !form) {
        throw new Error('Form not found.');
      }

      // 2. Draft context or live fallback check
      if (isDraftMode || !form.published_version) {
        return {
          success: true,
          schema: {
            id: form.id,
            name: form.name,
            fields: form.fields || [],
            config: form.config || {},
            status: form.status
          }
        };
      }

      // 3. Serve immutable snapshot for live public users
      const { data: versionSnap, error: snapErr } = await supabase
        .from('form_versions')
        .select('snapshot')
        .eq('form_id', formId)
        .eq('version_number', form.published_version)
        .single();

      if (snapErr || !versionSnap) {
        // Fallback to active draft configurations if snapshot is missing
        return {
          success: true,
          schema: {
            id: form.id,
            name: form.name,
            fields: form.fields || [],
            config: form.config || {},
            status: form.status
          }
        };
      }

      return {
        success: true,
        schema: {
          id: form.id,
          name: form.name,
          fields: versionSnap.snapshot.fields || [],
          config: versionSnap.snapshot.config || {},
          status: form.status,
          published_version: form.published_version
        }
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to resolve runtime schema.' };
    }
  }
};
