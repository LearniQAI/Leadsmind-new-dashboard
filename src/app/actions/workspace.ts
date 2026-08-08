'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getUser, requireWorkspaceAccess } from '@/lib/auth';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { ForbiddenError } from '@/shared/errors/AppError';
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
    plan_tier: 'spark',
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
 // Previously read the workspaceId straight off the cookie with only a
 // logged-in check (no membership verification) — swapped for the shared
 // requireWorkspaceAccess() helper, same fix already applied to this exact
 // function's dangerous settings.ts duplicate in Priority 0 item 4.
 let workspaceId: string;
 try {
  ({ workspaceId } = await requireWorkspaceAccess());
 } catch {
  return [];
 }

 const supabase = await createServerClient();
 const { data: members, error } = await supabase
  .from('workspace_members')
  .select('user_id, role')
  .eq('workspace_id', workspaceId);

 if (error || !members) return [];

 // workspace_members.user_id has no schema-registered FK to public.users
 // (only to auth.users), so a PostgREST embed fails outright — same fix
 // applied to settings.ts/tasks.ts's copies in Priority 0.
 const userIds = members.map((m) => m.user_id);
 const { data: users } = userIds.length
  ? await supabase.from('users').select('id, first_name, last_name').in('id', userIds)
  : { data: [] as any[] };
 const usersById = new Map((users || []).map((u) => [u.id, u]));

 return members
  .map((m) => usersById.get(m.user_id))
  .filter((u): u is { id: string; first_name: string; last_name: string } => !!u)
  .map((u) => ({
   id: u.id,
   name: `${u.first_name} ${u.last_name}`.trim(),
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

/**
 * Renames the caller's active workspace. This is the single source of truth for
 * `workspaces.name` — the dashboard header and every other "current workspace name"
 * display read this column directly, so this is the only action that should ever
 * write it (the Settings > Workspace tab's "Workspace name" field is a separate,
 * unrelated `workspace_branding.platform_name` value used for white-label display).
 */
export async function updateWorkspace(name: string) {
  try {
    const { workspaceId } = await requireWorkspaceRole(['admin']);

    const trimmed = name.trim();
    if (!trimmed) return { error: 'Workspace name cannot be empty' };
    if (trimmed.length > 100) return { error: 'Workspace name must be 100 characters or fewer' };

    const supabase = await createServerClient();
    const { error } = await supabase
      .from('workspaces')
      .update({ name: trimmed, updated_at: new Date().toISOString() })
      .eq('id', workspaceId);

    if (error) throw error;

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: any) {
    logger.error({ err }, 'workspace.rename.failed');
    return { error: err instanceof ForbiddenError
      ? 'Only workspace admins can rename this workspace'
      : 'Failed to rename workspace' };
  }
}

/**
 * Permanently deletes the caller's active workspace. Admin-only. Blocks outright
 * (rather than silently cancelling) if the workspace has any sign of an active paid
 * subscription, since there is no subscription table separate from `workspaces` —
 * losing the row would orphan a live Paystack/Stripe subscription with nothing left
 * to show for it. The caller must downgrade/cancel billing first.
 *
 * Every workspace-scoped table cascades on workspaces.id (see migrations
 * 20260806000002/3, 20260805000001, 20240101000037/158, and
 * 20260808000000 for the credit_notes/invoice_write_offs gap this closed) so a plain
 * delete on the workspaces row is sufficient to remove all dependent data.
 */
export async function deleteWorkspace(confirmName: string) {
  try {
    const { userId, workspaceId, role } = await requireWorkspaceRole(['admin']);

    const supabase = await createServerClient();
    const { data: workspace, error: fetchError } = await supabase
      .from('workspaces')
      .select('name, plan_tier, paystack_subscription_code, stripe_subscription_id')
      .eq('id', workspaceId)
      .single();

    if (fetchError || !workspace) return { error: 'Workspace not found' };

    if (confirmName.trim() !== workspace.name) {
      return { error: 'Workspace name does not match' };
    }

    // workspaces_plan_tier_check only allows 'spark' | 'rise' | 'surge' | 'infinity' | 'dynasty'
    // (migration 20260805000002_paystack_billing.sql) — 'spark' is the free tier every
    // workspace starts on (see createWorkspace above); anything else means a paid plan.
    const hasActiveSubscription =
      Boolean(workspace.paystack_subscription_code) ||
      Boolean(workspace.stripe_subscription_id) ||
      (workspace.plan_tier && workspace.plan_tier !== 'spark');

    if (hasActiveSubscription) {
      return {
        error: 'This workspace has an active paid subscription. Cancel or downgrade billing before deleting the workspace.',
      };
    }

    const { data: remainingWorkspaces } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .neq('workspace_id', workspaceId);

    const { error: deleteError } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', workspaceId);

    if (deleteError) throw deleteError;

    logger.info({ workspaceId, name: workspace.name, deletedBy: userId, role }, 'workspace.audit.delete');

    const cookieStore = await cookies();
    const fallbackWorkspaceId = remainingWorkspaces?.[0]?.workspace_id;
    if (fallbackWorkspaceId) {
      cookieStore.set('active_workspace_id', fallbackWorkspaceId, { maxAge: 60 * 60 * 24 * 30, path: '/' });
    } else {
      cookieStore.delete('active_workspace_id');
    }

    revalidatePath('/', 'layout');
    return { success: true, fallbackWorkspaceId: fallbackWorkspaceId || null };
  } catch (err: any) {
    logger.error({ err }, 'workspace.delete.failed');
    return { error: err instanceof ForbiddenError
      ? 'Only workspace admins can delete this workspace'
      : 'Failed to delete workspace' };
  }
}
