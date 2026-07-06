'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getUser } from '@/lib/auth';
import { cookies } from 'next/headers';
import { logger } from '@/shared/logger';

function slugify(text: string) {
 return text
  .toString()
  .toLowerCase()
  .trim()
  .replace(/\s+/g, '-')
  .replace(/[^\w-]+/g, '')
  .replace(/--+/g, '-');
}

export async function createWorkspace(name: string) {
 const user = await getUser();
 if (!user) return { success: false, error: 'Unauthorized' };

 const supabase = await createServerClient();

 try {
  const baseSlug = slugify(name);
  const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

  const { data: workspace, error: workspaceError } = await supabase
   .from('workspaces')
   .insert({
    name,
    slug,
    owner_id: user.id,
    plan_tier: 'free',
   })
   .select('id, name')
   .single();

  if (workspaceError) {
   logger.error({ err: workspaceError, userId: user.id }, 'workspace.create.failed');
   return { success: false, error: 'Failed to create workspace' };
  }

  // Add as admin member
  const { error: memberError } = await supabase
   .from('workspace_members')
   .insert({ 
    workspace_id: workspace.id, 
    user_id: user.id, 
    role: 'admin' 
   });

  if (memberError) {
   logger.error({ err: memberError, workspaceId: workspace.id, userId: user.id }, 'workspace.create.member_insert.failed');
  }

  // Set as active workspace
  const cookieStore = await cookies();
  cookieStore.set('active_workspace_id', workspace.id, {
   maxAge: 60 * 60 * 24 * 30, // 30 days
   path: '/',
  });

  revalidatePath('/', 'layout');
  return { success: true, workspaceId: workspace.id };
 } catch (err) {
  logger.error({ err, userId: user.id }, 'workspace.create_action.failed');
  return { success: false, error: 'An unexpected error occurred' };
 }
}

export async function getWorkspaceMembers() {
 const user = await getUser();
 if (!user) return [];

 const supabase = await createServerClient();
 const cookieStore = await cookies();
 const workspaceId = cookieStore.get('active_workspace_id')?.value;

 if (!workspaceId) return [];

 const { data, error } = await supabase
  .from('workspace_members')
  .select('user_id, role, users(id, first_name, last_name)')
  .eq('workspace_id', workspaceId);

 if (error || !data) return [];

 return data.map((m: any) => ({
  id: m.users.id,
  name: `${m.users.first_name} ${m.users.last_name}`.trim(),
 }));
}

/**
 * Saves workspace KYC compliance settings (registered name, registration number, and data-sharing entities)
 */
export async function saveWorkspaceKycSettings(
  workspaceId: string,
  payload: {
    registered_name?: string;
    company_reg_number?: string;
    kyc_data_sharing_entities?: string[];
  }
) {
  try {
    const user = await getUser();
    if (!user) return { error: 'Not authenticated' };

    const supabase = await createServerClient();

    // Verify user is admin in this workspace
    const { data: membership, error: memberError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberError || !membership || membership.role !== 'admin') {
      return { error: 'Unauthorized: Workspace administrators only' };
    }

    const { error: updateError } = await supabase
      .from('workspaces')
      .update({
        registered_name: payload.registered_name || null,
        company_reg_number: payload.company_reg_number || null,
        kyc_data_sharing_entities: payload.kyc_data_sharing_entities || [],
        updated_at: new Date().toISOString()
      })
      .eq('id', workspaceId);

    if (updateError) throw updateError;

    revalidatePath('/settings');
    return { success: true };
  } catch (err: any) {
    logger.error({ err, workspaceId }, 'workspace.kyc_settings.save.failed');
    return { error: 'Failed to save KYC settings' };
  }
}
