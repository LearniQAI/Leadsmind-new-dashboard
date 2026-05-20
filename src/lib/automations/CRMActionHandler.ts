/**
 * CRMActionHandler — implements CRM execution nodes for workflow runs.
 */
import { createAdminClient } from '@/lib/supabase/server';

export interface CRMActionPayload {
  workspaceId: string;
  contactId?: string;
  email?: string;
  formName: string;
  values: Record<string, any>;
}

export const CRMActionHandler = {
  /**
   * Execute target CRM action type with given configs
   */
  async executeAction(
    actionType: string,
    config: Record<string, any>,
    payload: CRMActionPayload
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const supabase = createAdminClient();
    const contactId = payload.contactId || (await this.resolveContactId(payload.email, payload.workspaceId, supabase));

    if (!contactId && actionType !== 'create_task') {
      return { success: false, error: 'Could not resolve CRM contact for action.' };
    }

    try {
      switch (actionType) {
        case 'create_task':
          return await this.createTask(supabase, payload.workspaceId, contactId, config);

        case 'assign_owner':
          return await this.assignContactOwner(supabase, contactId, config.ownerId);

        case 'update_pipeline':
          return await this.updatePipelineStage(supabase, payload.workspaceId, contactId, config.stage || config.stageId);

        case 'apply_tags':
          return await this.applyContactTags(supabase, contactId, config.tags || []);

        case 'create_note':
          return await this.createContactNote(supabase, payload.workspaceId, contactId, config.content || '', payload.formName);

        case 'update_fields':
          return await this.updateContactFields(supabase, contactId, payload.values);

        case 'create_reminder':
          return await this.createReminder(supabase, payload.workspaceId, contactId, config);

        default:
          return { success: false, error: `Unsupported CRM action type: ${actionType}` };
      }
    } catch (err: any) {
      console.error(`[CRMActionHandler] Execution error for ${actionType}:`, err);
      return { success: false, error: err.message || 'CRM Action database execution failed.' };
    }
  },

  /**
   * Resolves contact UUID by email in the given workspace.
   */
  async resolveContactId(email: string | undefined, workspaceId: string, supabase: any): Promise<string | null> {
    if (!email) return null;
    const { data } = await supabase
      .from('contacts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();
    return data?.id || null;
  },

  /**
   * Action: Create task
   */
  async createTask(supabase: any, workspaceId: string, contactId: string | null, config: any) {
    const { data, error } = await supabase
      .from('contact_tasks')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        title: config.title || 'Workflow CRM Task',
        description: config.description || 'Automatically created by LeadsMind workflow',
        priority: config.priority || 'normal',
        status: 'todo',
        due_date: config.dueDate || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0] // Default 2 days out
      })
      .select()
      .single();

    return error ? { success: false, error: error.message } : { success: true, data };
  },

  /**
   * Action: Assign Contact Owner
   */
  async assignContactOwner(supabase: any, contactId: string, ownerId: string) {
    const { data, error } = await supabase
      .from('contacts')
      .update({ owner_id: ownerId })
      .eq('id', contactId)
      .select()
      .single();

    return error ? { success: false, error: error.message } : { success: true, data };
  },

  /**
   * Action: Update Pipeline Stage
   */
  async updatePipelineStage(supabase: any, workspaceId: string, contactId: string, stageId: string) {
    // Find or upsert opportunity for contact
    const { data: existingOpp } = await supabase
      .from('opportunities')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('contact_id', contactId)
      .maybeSingle();

    let res;
    if (existingOpp) {
      res = await supabase
        .from('opportunities')
        .update({ stage_id: stageId, updated_at: new Date().toISOString() })
        .eq('id', existingOpp.id);
    } else {
      res = await supabase
        .from('opportunities')
        .insert({
          workspace_id: workspaceId,
          contact_id: contactId,
          title: 'Form Qualified Lead',
          stage_id: stageId,
          value: 0.00
        });
    }

    return res.error ? { success: false, error: res.error.message } : { success: true };
  },

  /**
   * Action: Apply Contact Tags
   */
  async applyContactTags(supabase: any, contactId: string, newTags: string[]) {
    if (!newTags || newTags.length === 0) return { success: true };

    const { data: contact } = await supabase
      .from('contacts')
      .select('tags')
      .eq('id', contactId)
      .single();

    const currentTags = contact?.tags || [];
    const mergedTags = Array.from(new Set([...currentTags, ...newTags]));

    const { error } = await supabase
      .from('contacts')
      .update({ tags: mergedTags })
      .eq('id', contactId);

    return error ? { success: false, error: error.message } : { success: true };
  },

  /**
   * Action: Create Contact Note
   */
  async createContactNote(supabase: any, workspaceId: string, contactId: string, content: string, formName: string) {
    const noteText = content || `Submitted form: ${formName}`;
    const { data, error } = await supabase
      .from('contact_notes')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        content: noteText,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    return error ? { success: false, error: error.message } : { success: true, data };
  },

  /**
   * Action: Update Contact fields
   */
  async updateContactFields(supabase: any, contactId: string, values: Record<string, any>) {
    // Extract standard contact fields
    const updates: Record<string, any> = {};
    if (values.name) updates.name = values.name;
    if (values.phone) updates.phone = values.phone;
    if (values.company) updates.company = values.company;
    
    // Save everything else to contact metadata
    updates.metadata = values;

    const { error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', contactId);

    return error ? { success: false, error: error.message } : { success: true };
  },

  /**
   * Action: Create reminder
   */
  async createReminder(supabase: any, workspaceId: string, contactId: string, config: any) {
    const { data, error } = await supabase
      .from('contact_tasks')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        title: `⏰ Follow-up Reminder: ${config.title || 'Contact'}`,
        description: config.description || 'Reminder created automatically from workflow steps.',
        priority: 'high',
        status: 'todo',
        due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0] // Tomorrow
      })
      .select()
      .single();

    return error ? { success: false, error: error.message } : { success: true, data };
  }
};
