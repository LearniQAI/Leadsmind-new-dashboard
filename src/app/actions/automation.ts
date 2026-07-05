'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { logger } from '@/shared/logger';
import { UnauthorizedError, ForbiddenError, toClientError } from '@/shared/errors/AppError';

/**
 * Calculates and updates the lead score for a contact.
 */
export async function calculateLeadScore(contactId: string, eventType: string = 'manual_update') {
 try {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) throw new ForbiddenError('No active workspace');
  
  // 1. Fetch current score
  const { data: contact, error: fetchError } = await supabase
   .from('contacts')
   .select('lead_score')
   .eq('id', contactId)
   .eq('workspace_id', workspaceId)
   .single();

  if (fetchError) throw fetchError;

  // 2. Determine score increment
  let increment = 5; // Default
  if (eventType === 'page_view') increment = 1;
  if (eventType === 'form_submission') increment = 25;
  if (eventType === 'email_open') increment = 2;
  if (eventType === 'email_click') increment = 10;

  const newScore = (contact?.lead_score || 0) + increment;

  // 3. Update the record
  const { error: updateError } = await supabase
   .from('contacts')
   .update({ 
    lead_score: newScore,
    last_activity_at: new Date().toISOString()
   })
   .eq('id', contactId)
   .eq('workspace_id', workspaceId);

  if (updateError) throw updateError;

  return { success: true, newScore };
 } catch (error: any) {
  logger.error({ err: error, contactId }, 'automation.lead_score.update.failed');
  const clientError = toClientError(error);
  return { success: false, error: clientError.error };
 }
}

export async function getAutomationLogsForContact(contactId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('automation_logs')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error({ err: error, contactId }, 'automation.logs.fetch.failed');
    return [];
  }
  return data || [];
}

/**
 * Triggers a neural automation sequence based on system events.
 * Automatically adds tags and logs activities in the CRM.
 */
export async function triggerAutomation(contactId: string, event: 'course_completed' | 'form_submitted' | 'ticket_created' | 'project_started') {
  try {
    const supabase = await createServerClient();
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { success: false, error: 'Unauthorized' };
    
    let tag = '';
    let description = '';

    switch (event) {
      case 'course_completed':
        tag = 'academy-graduate';
        description = 'Completed a neural learning node';
        break;
      case 'form_submitted':
        tag = 'lead-gen';
        description = 'Submitted a capture form';
        break;
      case 'ticket_created':
        tag = 'support-active';
        description = 'Initialized a support protocol';
        break;
      case 'project_started':
        tag = 'project-owner';
        description = 'Deployed a new project node';
        break;
    }

    if (tag) {
      // 1. Add Tag to Contact
      const { data: contact } = await supabase.from('contacts').select('tags').eq('id', contactId).eq('workspace_id', workspaceId).single();
      const currentTags = contact?.tags || [];
      if (!currentTags.includes(tag)) {
        await supabase.from('contacts').update({ tags: [...currentTags, tag] }).eq('id', contactId).eq('workspace_id', workspaceId);
      }

      // 2. Log Activity
      await supabase.from('contact_activities').insert({
        contact_id: contactId,
        type: 'edit',
        description: description,
        workspace_id: workspaceId
      });
    }

    return { success: true };
  } catch (err) {
    logger.error({ err, contactId, event }, 'automation.trigger.failed');
    return { success: false };
  }
}

