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
    priority: formData.priority,
    status: 'open'
   })
   .select()
   .single();

  if (error) throw error;

  // Send Email Notification to LeadsMind Admin
  try {
    const { sendEmail } = await import('@/lib/email');
    await sendEmail({
      to: 'support@leadsmind.ai', // Or the admin email
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
  } catch (emailErr) {
    console.error('Failed to send ticket email:', emailErr);
    // We still return success since the ticket was saved to DB
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
