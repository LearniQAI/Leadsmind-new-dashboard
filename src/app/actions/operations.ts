'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { logger } from '@/shared/logger';

// AUTOMATIONS
export async function getWorkflows() {
 let workspaceId: string | null = null;
 try {
  workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('workflows')
   .select('*, steps:workflow_steps(count)')
   .eq('workspace_id', workspaceId)
   .order('created_at', { ascending: false });

  if (error) throw error;
  return { data };
 } catch (error: any) {
  logger.error({ err: error, workspaceId }, 'operations.workflows.fetch.failed');
  return { error: 'Failed to fetch workflows.' };
 }
}

// BUSINESS OPS (Orders & Expenses)
export async function getOrders() {
 let workspaceId: string | null = null;
 try {
  workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('orders')
   .select('*, contact:contacts(first_name, last_name, email)')
   .eq('workspace_id', workspaceId)
   .order('created_at', { ascending: false });

  if (error) throw error;
  return { data };
 } catch (error: any) {
  logger.error({ err: error, workspaceId }, 'operations.orders.fetch.failed');
  return { error: 'Failed to fetch orders.' };
 }
}

// getExpenses previously lived here as a dead, unauthenticated duplicate of
// expenses.ts's getExpensesLive (the live, properly-hardened version, wired
// to ExpenseLiveClient.tsx and finance/expenses/page.tsx) — removed as part
// of the Priority 2 duplicate-implementation cleanup. Confirmed zero
// remaining callers of this file's copy before deleting.

// PROJECTS & SUPPORT
export async function getProjects() {
 let workspaceId: string | null = null;
 try {
  workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('projects')
   .select('*')
   .eq('workspace_id', workspaceId)
   .order('created_at', { ascending: false });

  if (error) throw error;
  return { data };
 } catch (error: any) {
  logger.error({ err: error, workspaceId }, 'operations.projects.fetch.failed');
  return { error: 'Failed to fetch projects.' };
 }
}

export async function createProject(name: string) {
  let workspaceId: string | null = null;
  try {
    workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('projects')
      .insert({
        workspace_id: workspaceId,
        name,
        status: 'planning'
      })
      .select()
      .single();

    if (error) throw error;

    // CRM Automation Hook
    try {
      const { triggerAutomation } = await import('./automation');
      if (data.contact_id) {
        await triggerAutomation(data.contact_id, 'project_started');
      }
    } catch (autoErr) {
      logger.error({ err: autoErr, workspaceId, contactId: data.contact_id }, 'operations.project.automation_hook.failed');
    }

    return { data };
  } catch (error: any) {
    logger.error({ err: error, workspaceId }, 'operations.project.create.failed');
    return { error: 'Failed to create project.' };
  }
}

export async function getSupportTickets() {
 let workspaceId: string | null = null;
 try {
  workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('support_tickets')
   .select('*, contact:contacts(first_name, last_name)')
   .eq('workspace_id', workspaceId)
   .order('created_at', { ascending: false });

  if (error) throw error;
  return { data };
 } catch (error: any) {
  logger.error({ err: error, workspaceId }, 'operations.support_tickets.fetch.failed');
  return { error: 'Failed to fetch support tickets.' };
 }
}

export async function createSupportTicket(formData: { subject: string, message: string, priority: string }) {
 let workspaceId: string | null = null;
 try {
  workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
   .from('support_tickets')
   .insert({
    workspace_id: workspaceId,
    title: formData.subject,
    description: formData.message,
    priority: formData.priority?.toLowerCase() || 'normal',
    status: 'open'
   })
   .select()
   .single();

  if (error) throw error;

  // CRM Automation Hook
  try {
    const { triggerAutomation } = await import('./automation');
    // Assuming we can link the current user to a contact for now, or use the contact_id if provided
    if (data.contact_id) {
      await triggerAutomation(data.contact_id, 'ticket_created');
    }
  } catch (autoErr) {
    logger.error({ err: autoErr, workspaceId, contactId: data.contact_id }, 'operations.support_ticket.automation_hook.failed');
  }

  // Send Email Notification to Workspace Admins and Owner
  try {
    const { getWorkspaceNotificationRecipients } = await import('@/lib/support-helper');
    const { emails: recipients } = await getWorkspaceNotificationRecipients(workspaceId);
    
    if (recipients && recipients.length > 0) {
      const { sendEmail } = await import('@/lib/email');
      await sendEmail({
        to: recipients,
        subject: `[New Ticket] ${formData.subject}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: #1359FF;">New Support Ticket</h2>
            <p><strong>Workspace:</strong> ${workspaceId}</p>
            <p><strong>From:</strong> ${user?.email}</p>
            <p><strong>Priority:</strong> ${formData.priority}</p>
            <hr/>
            <p><strong>Message:</strong></p>
            <p>${formData.message}</p>
          </div>
        `
      });
    }
  } catch (emailErr) {
    logger.error({ err: emailErr, workspaceId }, 'operations.support_ticket.notification_email.failed');
  }

  return { data };
 } catch (error: any) {
  logger.error({ err: error, workspaceId }, 'operations.support_ticket.create.failed');
  return { error: 'Failed to create support ticket.' };
 }
}

// MEDIA CENTER
export async function getMediaFiles() {
 let workspaceId: string | null = null;
 try {
  workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('media_files')
   .select('*')
   .eq('workspace_id', workspaceId)
   .order('created_at', { ascending: false });

  if (error) throw error;
  return { data };
 } catch (error: any) {
  logger.error({ err: error, workspaceId }, 'operations.media_files.fetch.failed');
  return { error: 'Failed to fetch media files.' };
 }
}

export async function saveTextDraftToMedia(name: string, content: string) {
  let workspaceId: string | null = null;
  try {
    workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    
    // We store the text draft inside the metadata of the media_files table
    // with type 'file' and mime_type 'text/plain'.
    // We use a pseudo-path 'draft://...' to differentiate from storage objects
    const { data, error } = await supabase
      .from('media_files')
      .insert({
        workspace_id: workspaceId,
        name: name,
        path: `draft://${Date.now()}`,
        type: 'file',
        mime_type: 'text/plain',
        size: Buffer.byteLength(content, 'utf8'),
        metadata: {
          content: content,
          isDraft: true
        }
      })
      .select()
      .single();

    if (error) throw error;
    return { data };
  } catch (error: any) {
    logger.error({ err: error, workspaceId }, 'operations.media_draft.save.failed');
    return { error: 'Failed to save draft.' };
  }
}
