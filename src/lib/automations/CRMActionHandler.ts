/**
 * CRMActionHandler — implements CRM execution nodes for workflow runs.
 */
import { createAdminClient } from '@/lib/supabase/server';
import { UnifiedActivityEngine } from '@/lib/crm/UnifiedActivityEngine';

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

        case 'send_whatsapp_voice':
          return await this.sendWhatsAppVoice(supabase, payload.workspaceId, contactId, config);

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
    // Reject a stage_id that doesn't belong to this workflow's own workspace —
    // an automation action is config the workspace owner wrote, but the stage
    // it targets must still be one of theirs.
    const { data: targetStage } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('id', stageId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (!targetStage) {
      return { success: false, error: 'stage_id does not belong to this workspace.' };
    }

    // Find or upsert opportunity for contact
    const { data: existingOpp } = await supabase
      .from('opportunities')
      .select('id, stage_id')
      .eq('workspace_id', workspaceId)
      .eq('contact_id', contactId)
      .maybeSingle();

    let res;
    const previousStageId = existingOpp?.stage_id ?? null;
    let opportunityId = existingOpp?.id ?? null;

    if (existingOpp) {
      res = await supabase
        .from('opportunities')
        .update({ stage_id: stageId, updated_at: new Date().toISOString() })
        .eq('id', existingOpp.id);
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('opportunities')
        .insert({
          workspace_id: workspaceId,
          contact_id: contactId,
          title: 'Form Qualified Lead',
          stage_id: stageId,
          value: 0.00
        })
        .select('id')
        .single();
      res = { error: insertError };
      opportunityId = inserted?.id ?? null;
    }

    if (res.error) return { success: false, error: res.error.message };

    // Keep automation-driven stage moves consistent with drag-and-drop /
    // API-driven ones: both should fire the same downstream trigger event
    // and webhook, or integrations relying on 'deal.stage_changed' silently
    // miss every move that came from a workflow instead of the UI.
    if (previousStageId !== stageId) {
      try {
        const { publishEvent } = await import('@/lib/events/EventBus');
        await publishEvent(workspaceId, 'opportunity_stage_changed', contactId, {
          dealId: opportunityId,
          stageId,
          previousStageId,
        });
      } catch (e) {
        console.error('[CRMActionHandler] Failed to publish opportunity_stage_changed event:', e);
      }

      try {
        const { dispatchWebhook } = await import('@/lib/webhooks/dispatcher');
        dispatchWebhook(workspaceId, 'deal.stage_changed', {
          deal: { id: opportunityId, contact_id: contactId },
          previous_stage_id: previousStageId,
          new_stage_id: stageId,
        }).catch(() => {});
      } catch (e) {
        console.error('[CRMActionHandler] Failed to dispatch deal.stage_changed webhook:', e);
      }
    }

    return { success: true };
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
  },

  async sendWhatsAppVoice(supabase: any, workspaceId: string, contactId: string | null, config: any) {
    if (!contactId) return { success: false, error: 'Contact ID required' };
    
    // Fetch contact
    const { data: contact } = await supabase
     .from("contacts")
     .select("phone, first_name")
     .eq("id", contactId)
     .single();

    if (!contact?.phone) return { success: false, error: 'Contact has no phone number' };

    // Fetch workspace settings
    const { data: workspace } = await supabase
     .from("workspaces")
     .select("twilio_sid, twilio_token, twilio_number, name, whatsapp_transcript_enabled")
     .eq("id", workspaceId)
     .single();

    // Fetch sender
    let senderName = 'Team Member';
    let senderJobTitle = 'AI Developer';
    if (config.senderId) {
      const { data: sender } = await supabase
       .from("users")
       .select("full_name, job_title")
       .eq("id", config.senderId)
       .single();
      if (sender) {
        senderName = sender.full_name || senderName;
        senderJobTitle = sender.job_title || senderJobTitle;
      }
    }

    const { sendSMS } = await import('@/lib/sms');

    const cleanPhone = contact.phone.startsWith('+') ? contact.phone : `+${contact.phone}`;
    const to = `whatsapp:${cleanPhone}`;
    const from = `whatsapp:${workspace?.twilio_number || process.env.TWILIO_PHONE_NUMBER}`;

    // Message 1: Identity
    const workspaceName = workspace?.name || 'LeadsMind';
    const msg1Text = `Hi ${contact.first_name || 'there'}, this is ${senderName} — ${senderJobTitle} at ${workspaceName}. I have left you a quick voice message below 👇`;
    
    await sendSMS({
      to,
      message: msg1Text,
      config: {
        accountSid: workspace?.twilio_sid,
        authToken: workspace?.twilio_token,
        fromNumber: from,
      }
    });

    // Small delay to ensure correct chronological sequence timing
    await new Promise(r => setTimeout(r, 600));

    // Message 2: Audio Content
    const audioUrl = config.audioUrl || config.audio_url || '';
    await sendSMS({
      to,
      message: "",
      mediaUrl: audioUrl,
      config: {
        accountSid: workspace?.twilio_sid,
        authToken: workspace?.twilio_token,
        fromNumber: from,
      }
    });

    // Message 3: Transcript Context
    const transcript = config.transcript || config.original_text || '';
    const sendTranscript = config.sendTranscript !== false && workspace?.whatsapp_transcript_enabled !== false;
    
    if (sendTranscript && transcript) {
      await new Promise(r => setTimeout(r, 600));
      const excerpt = transcript.slice(0, 200);
      const msg3Text = `📝 Transcript: ${excerpt}${transcript.length > 200 ? '...' : ''}`;
      
      await sendSMS({
        to,
        message: msg3Text,
        config: {
          accountSid: workspace?.twilio_sid,
          authToken: workspace?.twilio_token,
          fromNumber: from,
        }
      });
    }

    // Log the activity to the CRM timeline feed
    try {
      await UnifiedActivityEngine.logActivity(
        workspaceId,
        config.senderId || null,
        'contact',
        contactId,
        'voice_note',
        `Sent voice note via WhatsApp.`,
        {
          channel: 'whatsapp',
          audio_url: audioUrl,
          transcript: transcript,
          destination: cleanPhone
        }
      );
    } catch (actErr) {
      console.error('[CRMActionHandler] Failed to log WhatsApp voice activity:', actErr);
    }

    return { success: true };
  }
};
