'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

// BRANDING
export async function getWorkspaceBranding() {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('workspace_branding')
   .select('*')
   .eq('workspace_id', workspaceId)
   .single();

  if (error && error.code !== 'PGRST116') throw error;
  return { data };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function updateWorkspaceBranding(updates: any) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('workspace_branding')
   .upsert({ workspace_id: workspaceId, ...updates, updated_at: new Date().toISOString() })
   .select()
   .single();

  if (error) throw error;
  return { data };
 } catch (error: any) {
  return { error: error.message };
 }
}

// TEAM
export async function getWorkspaceMembers() {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('workspace_members')
   .select('*, user:users(*)')
   .eq('workspace_id', workspaceId);

  if (error) throw error;
  return { data };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function inviteTeamMember(email: string, role: string = 'member') {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  
  // 1. Create the invitation record in the database
  const { data, error } = await supabase
   .from('workspace_invitations')
   .insert({
    workspace_id: workspaceId,
    email,
    role,
    invited_by: (await supabase.auth.getUser()).data.user?.id
   })
   .select()
   .single();

  if (error) throw error;

  const { data: workspace } = await supabase
   .from('workspaces')
   .select('name')
   .eq('id', workspaceId)
   .single();

  await sendEmail({
    to: email,
    subject: `You've been invited to join ${workspace?.name || 'a workspace'} on LeadsMind`,
    html: `
     <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #6c47ff;">Join ${workspace?.name || 'LeadsMind'}</h2>
      <p>You have been invited to join the <strong>${workspace?.name}</strong> workspace as a <strong>${role}</strong>.</p>
      <p>Click the link below to accept your invitation and set up your account:</p>
      <div style="margin: 30px 0;">
       <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/signup?email=${encodeURIComponent(email)}&invite=${data.id}" 
         style="display: inline-block; padding: 14px 30px; background-color: #6c47ff; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Accept Invitation
       </a>
      </div>
      <hr style="border: 0; border-top: 1px solid #eee;" />
      <p style="color: #888; font-size: 12px; margin-top: 20px;">
       This invitation was sent by LeadsMind on behalf of ${workspace?.name}. 
       If you didn't expect this invitation, you can safely ignore this email.
      </p>
     </div>
    `
   });

  return { data };
 } catch (error: any) {
  return { error: error.message };
 }
}

// WEBHOOKS
export async function getWebhooks() {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('webhook_endpoints')
   .select('*')
   .eq('workspace_id', workspaceId);

  if (error) throw error;
  return { data };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function createWebhook(url: string, events: string[]) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('webhook_endpoints')
   .insert({ workspace_id: workspaceId, url, events })
   .select()
   .single();

  if (error) throw error;
  return { data };
 } catch (error: any) {
  return { error: error.message };
 }
}

// API KEYS
export async function getWorkspaceApiKey() {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('workspaces')
   .select('api_key')
   .eq('id', workspaceId)
   .single();

  if (error) throw error;
  return { data: data.api_key };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function generateWorkspaceApiKey() {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const newKey = `lm_sk_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('workspaces')
   .update({ api_key: newKey })
   .eq('id', workspaceId)
   .select()
   .single();

  if (error) throw error;
  return { data: data.api_key };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function updateWorkspaceLogo(logoUrl: string) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  
  // Update both workspace branding and workspace table for compatibility
  await supabase.from('workspace_branding').upsert({ workspace_id: workspaceId, logo_url: logoUrl });
  await supabase.from('workspaces').update({ logo_url: logoUrl }).eq('id', workspaceId);

  return { success: true };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function testEmailConnection() {
 try {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: 'No user email found' };

  await sendEmail({
   to: user.email,
   subject: 'LeadsMind Email Connectivity Test',
   html: `
    <div style="font-family: sans-serif; padding: 20px; color: #333; border: 1px solid #6c47ff; border-radius: 12px;">
     <h2 style="color: #6c47ff;">Connectivity Test Successful</h2>
     <p>Hello,</p>
     <p>This is a live test from your LeadsMind Dashboard. If you are reading this, your <strong>Resend API Connection</strong> is fully operational.</p>
     <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
     <p style="font-size: 12px; color: #666;">Timestamp: ${new Date().toLocaleString()}</p>
    </div>
   `
  });

  return { success: true };
 } catch (error: any) {
  console.error('[testEmailConnection] Error:', error.message);
  return { error: error.message };
 }
}
