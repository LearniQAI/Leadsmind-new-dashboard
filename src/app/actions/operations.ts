'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';

// AUTOMATIONS
export async function getWorkflows() {
 try {
  const workspaceId = await getCurrentWorkspaceId();
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
  return { error: error.message };
 }
}

// BUSINESS OPS (Orders & Expenses)
export async function getOrders() {
 try {
  const workspaceId = await getCurrentWorkspaceId();
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
  return { error: error.message };
 }
}

export async function getExpenses() {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('accounting_transactions')
   .select('*')
   .eq('workspace_id', workspaceId)
   .order('date', { ascending: false });

  if (error) throw error;
  return { data };
 } catch (error: any) {
  return { error: error.message };
 }
}

// PROJECTS & SUPPORT
export async function getProjects() {
 try {
  const workspaceId = await getCurrentWorkspaceId();
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
  return { error: error.message };
 }
}

export async function createProject(name: string) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
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
      console.error('Automation hook failed:', autoErr);
    }

    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getSupportTickets() {
 try {
  const workspaceId = await getCurrentWorkspaceId();
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
  return { error: error.message };
 }
}

export async function createSupportTicket(formData: { subject: string, message: string, priority: string }) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
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
    console.error('Automation hook failed:', autoErr);
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
    console.error('Failed to send ticket email:', emailErr);
  }

  return { data };
 } catch (error: any) {
  return { error: error.message };
 }
}

// MEDIA CENTER
export async function getMediaFiles() {
 try {
  const workspaceId = await getCurrentWorkspaceId();
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
  return { error: error.message };
 }
}

export async function saveTextDraftToMedia(name: string, content: string) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
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
    return { error: error.message };
  }
}
