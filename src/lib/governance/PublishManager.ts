/**
 * PublishManager — coordinates form safety validation, 
 * draft publishing, and production deployment controls.
 */

import { createClient } from '@/lib/supabase/client';
import { VersionManager } from './VersionManager';
import { AuditLogger } from './AuditLogger';

export interface PublishValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export const PublishManager = {
  /**
   * Run structural conversion integrity checks on draft configuration.
   */
  validateForm(fields: any[], config: any, workflows: any[]): PublishValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // 1. Missing required field labels or types
    if (fields.length === 0) {
      errors.push('The form must contain at least one input field.');
    }

    fields.forEach((f, idx) => {
      if (!f.label?.trim()) {
        errors.push(`Field at position ${idx + 1} is missing a descriptive label.`);
      }
    });

    // 2. Broken automations check
    const hasActiveWorkflow = workflows.some(w => w.is_active);
    if (workflows.length > 0 && !hasActiveWorkflow) {
      warnings.push('All configured CRM automations are inactive. Submissions will not trigger follow-up actions.');
    }

    // 3. Payment integrations check
    const hasPaymentField = fields.some(f => f.type === 'payment');
    const isStripeConfigured = config.stripeConnected || config.paymentProcessor === 'stripe';
    if (hasPaymentField && !isStripeConfigured) {
      errors.push('Form includes a payment field, but no payment gateway configuration is connected.');
    }

    // 4. Missing email templates for email actions
    workflows.forEach(w => {
      if (Array.isArray(w.steps)) {
        w.steps.forEach((s: any) => {
          if (s.type === 'send_email' && (!s.config?.body || !s.config?.subject)) {
            errors.push(`Workflow "${w.name}" contains an email step missing subject or body details.`);
          }
        });
      }
    });

    return {
      valid: errors.length === 0,
      warnings,
      errors
    };
  },

  /**
   * Safe publishing routine. Validates first, snapshots, and updates form status to published.
   */
  async publishDraft(
    formId: string,
    notes: string,
    actor: string
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    try {
      // 1. Fetch current draft data and workflows
      const { data: form, error: formErr } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (formErr || !form) throw new Error('Form not found.');

      const { data: workflows } = await supabase
        .from('workflows')
        .select('*')
        .eq('form_id', formId);

      // 2. Validate layouts
      const validation = this.validateForm(form.fields || [], form.config || {}, workflows || []);
      if (!validation.valid) {
        throw new Error(`Publish validation failed: ${validation.errors.join(' ')}`);
      }

      // 3. Take an immutable snapshot of the published layout
      const snapshot = {
        fields: form.fields,
        config: form.config,
        workflows: workflows || []
      };

      const snapRes = await VersionManager.createSnapshot(formId, snapshot, notes, actor);
      if (!snapRes.success) throw new Error(snapRes.error);

      // 4. Mark parent form status as published and save published_version mapping
      const { error: publishErr } = await supabase
        .from('forms')
        .update({
          status: 'published',
          published_version: snapRes.version?.version_number,
          published_at: new Date().toISOString()
        })
        .eq('id', formId);

      if (publishErr) throw publishErr;

      // 5. Track in audit logs
      await AuditLogger.logAction(
        formId,
        'publish',
        actor,
        `Published version #${snapRes.version?.version_number}`,
        { notes, version: snapRes.version?.version_number }
      );

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Publishing failed.' };
    }
  },

  /**
   * Unpublish the form back into draft mode.
   */
  async unpublishForm(formId: string, actor: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('forms')
        .update({ status: 'draft' })
        .eq('id', formId);

      if (error) throw error;

      await AuditLogger.logAction(formId, 'unpublish', actor, 'Deactivated form to Draft mode', {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to unpublish.' };
    }
  }
};
