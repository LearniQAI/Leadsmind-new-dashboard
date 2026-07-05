'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId as getWsId, getCurrentWorkspace } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { revalidatePath } from 'next/cache';
import { createHash, randomBytes } from 'crypto';
import { logger } from '@/shared/logger';

async function getActiveWorkspaceId() {
  const id = await getWsId();
  if (id) return id;
  
  const ws = await getCurrentWorkspace();
  return ws?.id || null;
}

// Audit Trail Stub
async function logAdminAction(action: string, targetId: string, details: any) {
  logger.info({ action, targetId, details }, 'settings.audit.admin_action');
  // This can be expanded to write to an 'audit_logs' table
}

// BRANDING
export async function getWorkspaceBranding() {
 try {
  const workspaceId = await getActiveWorkspaceId();
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
  logger.error({ err: error }, 'get.workspace.branding.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function updateWorkspaceBranding(updates: any) {
 try {
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  
  // Check existence to bypass ambiguous upsert unique constraint requirements
  const { data: existing } = await supabase
   .from('workspace_branding')
   .select('id')
   .eq('workspace_id', workspaceId)
   .single();

  let queryResult;
  if (existing) {
   queryResult = await supabase
    .from('workspace_branding')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .select()
    .single();
  } else {
   queryResult = await supabase
    .from('workspace_branding')
    .insert({ workspace_id: workspaceId, ...updates, updated_at: new Date().toISOString() })
    .select()
    .single();
  }

  if (queryResult.error) throw queryResult.error;
  return { data: queryResult.data };
 } catch (error: any) {
  logger.error({ err: error }, 'update.workspace.branding.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function verifyCustomDomainCname(customDomain: string) {
  try {
    const workspaceId = await getActiveWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const cleanDomain = customDomain.trim().toLowerCase();
    if (!cleanDomain) {
      return { error: 'Domain name cannot be empty' };
    }

    const dnsModule = await import('dns');
    let dnsVerified = false;
    let sslStatus: 'active' | 'failed' = 'failed';

    try {
      const records = await dnsModule.promises.resolveCname(cleanDomain);
      dnsVerified = records.some(r => 
        r.toLowerCase().includes('leadsmind.io') || 
        r.toLowerCase().includes('vercel.app')
      );
      sslStatus = dnsVerified ? 'active' : 'failed';
    } catch (dnsErr: any) {
      logger.warn({ err: dnsErr, workspaceId, domain: cleanDomain }, 'settings.cname_verification.dns_lookup_failed');
      sslStatus = 'failed';
    }

    // Upsert or update branding info
    const { data: existing } = await supabase
      .from('workspace_branding')
      .select('id')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    let queryResult;
    if (existing) {
      queryResult = await supabase
        .from('workspace_branding')
        .update({
          custom_domain: cleanDomain,
          custom_domain_ssl_status: sslStatus,
          updated_at: new Date().toISOString()
        })
        .eq('workspace_id', workspaceId)
        .select()
        .single();
    } else {
      queryResult = await supabase
        .from('workspace_branding')
        .insert({
          workspace_id: workspaceId,
          custom_domain: cleanDomain,
          custom_domain_ssl_status: sslStatus,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
    }

    if (queryResult.error) throw queryResult.error;

    return { success: true, sslStatus, dnsVerified };
  } catch (error: any) {
    logger.error({ err: error, domain: customDomain }, 'settings.custom_domain_cname.verify.failed');
    return { error: 'Failed to verify custom domain.' };
  }
}

// TEAM
export async function getWorkspaceMembers() {
 try {
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = createAdminClient();
  // We use a broader select to ensure we get members even if user profile join has issues
  const { data, error } = await supabase
   .from('workspace_members')
   .select(`
     id,
     workspace_id,
     user_id,
     role,
     permissions,
     user:users (
       id,
       email,
       first_name,
       last_name,
       avatar_url
     )
   `)
   .eq('workspace_id', workspaceId);

  if (error) {
    logger.error({ err: error, workspaceId }, 'settings.workspace_members.fetch.failed');
    throw error;
  }
  
  return { data };
 } catch (error: any) {
  logger.error({ err: error }, 'get.workspace.members.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function getWorkspaceInvitations() {
 try {
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('workspace_invitations')
   .select('*')
   .eq('workspace_id', workspaceId);

  if (error) throw error;
  return { data };
 } catch (error: any) {
  logger.error({ err: error }, 'get.workspace.invitations.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function inviteTeamMember(
 email: string,
 role: string = 'member',
 permissions: string[] = ['dashboard'],
 options?: { directCreate?: boolean; fullName?: string; password?: string }
) {
 let workspaceId: string | null = null;
 try {
  workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // Security check: Only admins can invite/create members
  const { data: currentMember } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', currentUser?.id)
    .single();

  if (currentMember?.role !== 'admin') {
    return { error: 'Unauthorized: Only workspace admins can manage team members' };
  }

  if (options?.directCreate) {
   const adminSupabase = createAdminClient();
   
   // 1. Create the user directly via Admin Auth
   const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password: options.password,
    email_confirm: true,
    user_metadata: { full_name: options.fullName }
   });

   if (authError) {
     logger.error({ err: authError, workspaceId }, 'settings.team_member.auth_create.failed');
     return { error: 'Failed to create user account.' };
   }

   // 1.5 Create user profile record in public.users
   const { error: profileError } = await adminSupabase
    .from('users')
    .insert({
     id: authData.user.id,
     email: email,
     first_name: options.fullName?.split(' ')[0] || '',
     last_name: options.fullName?.split(' ').slice(1).join(' ') || '',
    });

   if (profileError) logger.error({ err: profileError, workspaceId }, 'settings.team_member.profile_create.failed');

   // 2. Insert into workspace_members via Admin to bypass RLS
   const { error: memberError } = await adminSupabase
    .from('workspace_members')
    .insert({
     workspace_id: workspaceId,
     user_id: authData.user.id,
     role,
     permissions
    });

   if (memberError) {
     logger.error({ err: memberError, workspaceId }, 'settings.team_member.member_insert.failed');
     return { error: 'Failed to add member to workspace.' };
   }

   revalidatePath('/settings');
   return { data: authData.user };
  } else {
   const adminSupabase = createAdminClient();
   // Invitation Logic via Admin to bypass RLS
   const { data, error } = await adminSupabase
    .from('workspace_invitations')
    .insert({
     workspace_id: workspaceId,
     email,
     role,
     permissions,
     invited_by: currentUser?.id
    })
    .select()
    .single();

   if (error) {
     logger.error({ err: error, workspaceId }, 'settings.team_invitation.insert.failed');
     return { error: 'Failed to create invitation.' };
   }

   revalidatePath('/settings');

   const { data: workspace } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .single();

   await sendEmail({
     to: email,
     subject: `Join ${workspace?.name || 'LeadsMind'} Workspace`,
     html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #2563eb; border-radius: 16px; background-color: #04091a; color: #eef2ff;">
       <h2 style="color: #3b82f6; font-size: 24px;">Workspace <span style="color: #ffffff;">Invitation</span></h2>
       <p style="color: #94a3c8; font-size: 14px;">You have been authorized to join <strong>${workspace?.name}</strong>.</p>
       <div style="margin: 24px 0; padding: 20px; background-color: rgba(255,255,255,0.05); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
         <p style="margin: 0; font-size: 12px; color: #4a5a82; text-transform: uppercase; letter-spacing: 1px;">Access Protocol</p>
         <p style="margin: 8px 0 0; font-size: 16px; font-weight: bold; color: #3b82f6;">${role.toUpperCase()}</p>
       </div>
       <p style="color: #94a3c8;">Accept the invitation below to initialize your node:</p>
       <div style="margin: 30px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/signup?email=${encodeURIComponent(email)}&invite=${data.id}" 
          style="display: inline-block; padding: 14px 40px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
         Accept Invitation
        </a>
       </div>
      </div>
     `
    });

   return { data };
  }
 } catch (error: any) {
  logger.error({ err: error, workspaceId }, 'settings.team_member.invite.failed');
  return { error: 'Failed to invite team member.' };
 }
}

export async function updateMemberPermissions(memberId: string, role: string, permissions: string[]) {
  try {
    const workspaceId = await getActiveWorkspaceId();
    if (!workspaceId) {
      logger.error({ memberId }, 'settings.member_permissions.no_workspace');
      return { error: 'No workspace active' };
    }

    const supabase = await createServerClient();
    const adminClient = await createAdminClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // Security check: Only admins can manage permissions
    const { data: currentMember, error: checkError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', currentUser?.id)
      .single();

    if (checkError || !currentMember) {
      logger.error({ err: checkError, workspaceId, memberId }, 'settings.member_permissions.security_check.failed');
      return { error: 'Unauthorized: Could not verify permissions' };
    }

    if (currentMember.role !== 'admin' && currentMember.role !== 'owner') {
      logger.warn({ workspaceId, memberId, role: currentMember.role }, 'settings.member_permissions.unauthorized_role');
      return { error: 'Unauthorized: Insufficient privileges' };
    }

    const { error: updateError } = await adminClient
      .from('workspace_members')
      .update({ 
        role, 
        permissions
      })
      .eq('id', memberId)
      .eq('workspace_id', workspaceId);

    if (updateError) {
      logger.error({ err: updateError, workspaceId, memberId }, 'settings.member_permissions.update.failed');
      throw updateError;
    }

    revalidatePath('/settings');
    await logAdminAction('UPDATE_PERMISSIONS', memberId, { role, permissions });
    return { success: true };
  } catch (error: any) {
    logger.error({ err: error, memberId }, 'settings.member_permissions.update_action.failed');
    return { error: 'Failed to update member permissions.' };
  }
}

export async function deleteMember(memberId: string) {
  try {
    const workspaceId = await getActiveWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const adminClient = await createAdminClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // Security check
    const { data: currentMember } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', currentUser?.id)
      .single();

    if (currentMember?.role !== 'admin' && currentMember?.role !== 'owner') {
      return { error: 'Unauthorized' };
    }

    const { error } = await adminClient
      .from('workspace_members')
      .delete()
      .eq('id', memberId)
      .eq('workspace_id', workspaceId);

    if (error) throw error;

    revalidatePath('/settings');
    await logAdminAction('DELETE_MEMBER', memberId, { workspaceId });
    return { success: true };
  } catch (error: any) {
    logger.error({ err: error }, 'delete.member.failed');
    return { error: 'Operation failed. Please try again.' };
  }
}

export async function removeInvitation(invitationId: string) {
  try {
    const workspaceId = await getActiveWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const adminClient = await createAdminClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // Security check
    const { data: currentMember } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', currentUser?.id)
      .single();

    if (currentMember?.role !== 'admin' && currentMember?.role !== 'owner') {
      return { error: 'Unauthorized' };
    }

    const { error } = await adminClient
      .from('workspace_invitations')
      .delete()
      .eq('id', invitationId)
      .eq('workspace_id', workspaceId);

    if (error) throw error;

    revalidatePath('/settings');
    await logAdminAction('REMOVE_INVITATION', invitationId, { workspaceId });
    return { success: true };
  } catch (error: any) {
    logger.error({ err: error }, 'remove.invitation.failed');
    return { error: 'Operation failed. Please try again.' };
  }
}

// WEBHOOKS
export async function getWebhooks() {
 try {
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('webhook_endpoints')
   .select('*')
   .eq('workspace_id', workspaceId);

  if (error) throw error;
  return { data };
 } catch (error: any) {
  logger.error({ err: error }, 'get.webhooks.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function createWebhook(url: string, events: string[]) {
 try {
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const secret = `whsec_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
  const { data, error } = await supabase
   .from('webhook_endpoints')
   .insert({ workspace_id: workspaceId, url, events, secret, is_active: true })
   .select()
   .single();

  if (error) throw error;
  revalidatePath('/settings');
  return { data };
 } catch (error: any) {
  logger.error({ err: error }, 'create.webhook.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function deleteWebhook(id: string) {
 try {
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { error } = await supabase
   .from('webhook_endpoints')
   .delete()
   .eq('id', id)
   .eq('workspace_id', workspaceId);

  if (error) throw error;
  revalidatePath('/settings');
  return { success: true };
 } catch (error: any) {
  logger.error({ err: error }, 'delete.webhook.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function getWebhookLogs(webhookId: string) {
 try {
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('webhook_delivery_logs')
   .select('*')
   .eq('webhook_id', webhookId)
   .eq('workspace_id', workspaceId)
   .order('delivered_at', { ascending: false })
   .limit(20);

  if (error) throw error;
  return { data };
 } catch (error: any) {
  logger.error({ err: error }, 'get.webhook.logs.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}


// API KEYS
export async function getWorkspaceApiKey() {
 try {
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('workspaces')
   .select('api_key')
  .eq("id", workspaceId).eq("workspace_id", workspaceId)
   .single();

  if (error) throw error;
  return { data: data.api_key };
 } catch (error: any) {
  logger.error({ err: error }, 'get.workspace.api.key.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function generateWorkspaceApiKey() {
 try {
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const newKey = `lm_sk_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('workspaces')
   .update({ api_key: newKey })
  .eq("id", workspaceId).eq("workspace_id", workspaceId)
   .select()
   .single();

  if (error) throw error;
  return { data: data.api_key };
 } catch (error: any) {
  logger.error({ err: error }, 'generate.workspace.api.key.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function updateWorkspaceLogo(logoUrl: string) {
 try {
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  
  // Check existence to bypass ambiguous upsert unique constraint requirements
  const { data: existing } = await supabase
   .from('workspace_branding')
   .select('id')
   .eq('workspace_id', workspaceId)
   .single();

  if (existing) {
   await supabase.from('workspace_branding').update({ logo_url: logoUrl, updated_at: new Date().toISOString() }).eq('workspace_id', workspaceId);
  } else {
   await supabase.from('workspace_branding').insert({ workspace_id: workspaceId, logo_url: logoUrl, updated_at: new Date().toISOString() });
  }

  await supabase.from('workspaces').update({ logo_url: logoUrl }).eq('id', workspaceId);

  return { success: true };
 } catch (error: any) {
  logger.error({ err: error }, 'update.workspace.logo.failed');
  return { error: 'Operation failed. Please try again.' };
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
  logger.error({ err: error }, 'settings.email_connection.test.failed');
  return { error: 'Failed to send test email.' };
 }
}

export async function getOAuthClients() {
 try {
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('oauth_clients')
   .select('*')
   .eq('workspace_id', workspaceId)
   .order('created_at', { ascending: false });

  if (error) throw error;
  return { data };
 } catch (error: any) {
  logger.error({ err: error }, 'get.oauth.clients.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function createOAuthClient(name: string, redirectUris: string[], scopes: string[]) {
 try {
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const clientId = 'client_' + randomBytes(16).toString('hex');
  const clientSecret = 'secret_' + randomBytes(24).toString('hex');
  const secretHash = createHash('sha256').update(clientSecret).digest('hex');

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('oauth_clients')
   .insert({
    name,
    client_id: clientId,
    client_secret_hash: secretHash,
    redirect_uris: redirectUris,
    scopes: scopes,
    workspace_id: workspaceId
   })
   .select('*')
   .single();

  if (error) throw error;
  revalidatePath('/settings');
  return { data, clientSecret }; // Return raw secret once for user copy
 } catch (error: any) {
  logger.error({ err: error }, 'create.oauth.client.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function deleteOAuthClient(clientId: string) {
 try {
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { error } = await supabase
   .from('oauth_clients')
   .delete()
   .eq('client_id', clientId)
   .eq('workspace_id', workspaceId);

  if (error) throw error;
  revalidatePath('/settings');
  return { success: true };
 } catch (error: any) {
  logger.error({ err: error }, 'delete.oauth.client.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

