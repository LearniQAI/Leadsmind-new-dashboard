'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId, getUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/email';

export async function createWorkflow(data: { name: string; trigger_type: string; description?: string }) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data: workflow, error } = await supabase
   .from('workflows')
   .insert({ workspace_id: workspaceId, ...data, is_active: false })
   .select()
   .single();

  if (error) throw error;

  // Send notification email to the creator
  const user = await getUser();
  if (user?.email) {
   await sendEmail({
    to: user.email,
    subject: `New Automation Created: ${data.name}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
       <h2 style="color: #6c47ff;">Automation Created!</h2>
       <p>Hello,</p>
       <p>You have successfully created a new automation: <strong>${data.name}</strong>.</p>
       <p>Description: ${data.description || 'No description provided.'}</p>
       <p>Trigger: ${data.trigger_type}</p>
       <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
       <p style="font-size: 12px; color: #666;">This is an automated notification from your LeadsMind Dashboard.</p>
      </div>
     `
   }).catch(err => console.error('Failed to send automation creation email:', err));
  }

  revalidatePath('/automations');
  return { data: workflow };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function updateWorkflow(id: string, updates: any) {
 try {
  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('workflows')
   .update(updates)
   .eq('id', id)
   .select()
   .single();

  if (error) throw error;

  // Send notification email to the creator about the update
  const user = await getUser();
  if (user?.email) {
   await sendEmail({
    to: user.email,
    subject: `Automation Updated: ${data.name}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
       <h2 style="color: #6c47ff;">Automation Updated</h2>
       <p>Hello,</p>
       <p>The automation <strong>${data.name}</strong> has been updated.</p>
       <p>You will continue to receive updates regarding your automations.</p>
       <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
       <p style="font-size: 12px; color: #666;">This is an automated notification from your LeadsMind Dashboard.</p>
      </div>
     `
   }).catch(err => console.error('Failed to send automation update email:', err));
  }

  revalidatePath('/automations');
  return { data };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function deleteWorkflow(id: string) {
 try {
  const supabase = await createServerClient();
  const { error } = await supabase.from('workflows').delete().eq('id', id);
  if (error) throw error;
  revalidatePath('/automations');
  return { success: true };
 } catch (error: any) {
  return { error: error.message };
 }
}
