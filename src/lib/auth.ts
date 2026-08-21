

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createServerClient, createAdminClient } from './supabase/server';
import { cookies } from 'next/headers';
import { logger } from '@/shared/logger';
import { ForbiddenError, UnauthorizedError } from '@/lib/errors';
import { PlanTier } from '@/types/planTier.types';

// ─────────────────────────────────────────────────────────────────────────────
// Session & User
// ─────────────────────────────────────────────────────────────────────────────

export const getSession = cache(async () => {
 const supabase = await createServerClient();
 try {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) return null;
  return session;
 } catch (error) {
  console.error('[auth] Error fetching session:', error);
  return null;
 }
});

export const getUser = cache(async () => {
 const supabase = await createServerClient();
 try {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) return null;
  return user;
 } catch (error) {
   return null;
 }
});

export async function requireAuth() {
 const user = await getUser();
 if (!user) {
  redirect('/auth/signin-basic');
 }
 return user;
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile (users table — always returns camelCase for UI layer)
// ─────────────────────────────────────────────────────────────────────────────

export interface UserProfile {
 id: string;
 email: string;
 firstName: string;
 lastName: string;
 avatarUrl: string | null;
 createdAt: string;
}

export const getCurrentProfile = cache(async (existingUser?: any): Promise<UserProfile | null> => {
 const user = existingUser || await getUser();
 if (!user) return null;

 const supabase = await createServerClient();
 const { data, error } = await supabase
  .from('users')
  .select('id, email, first_name, last_name, avatar_url, created_at')
  .eq('id', user.id)
  .single();

 if (error || !data) {
  // Profile doesn't exist yet — create it now (fallback for trigger failures)
  const nameParts = (user.user_metadata?.full_name ?? user.email ?? '').split(' ');
  const { data: created } = await supabase
   .from('users')
   .upsert({
    id: user.id,
    email: user.email ?? '',
    first_name: nameParts[0] ?? '',
    last_name: nameParts.slice(1).join(' ') ?? '',
    avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
   })
   .select('id, email, first_name, last_name, avatar_url, created_at')
   .single();

  if (!created) return null;

  return {
   id: created.id,
   email: created.email,
   firstName: created.first_name,
   lastName: created.last_name,
   avatarUrl: created.avatar_url ?? null,
   createdAt: created.created_at,
  };
 }

 return {
  id: data.id,
  email: data.email,
  firstName: data.first_name,
  lastName: data.last_name,
  avatarUrl: data.avatar_url ?? null,
  createdAt: data.created_at,
 };
});

// ─────────────────────────────────────────────────────────────────────────────
// Workspace
// ─────────────────────────────────────────────────────────────────────────────

export interface Workspace {
 id: string;
 name: string;
 slug: string;
 logoUrl: string | null;
 ownerId: string;
 plan: PlanTier;
 createdAt: string;
}

export async function getCurrentWorkspaceId(): Promise<string | null> {
 const cookieStore = cookies();
 return cookieStore.get('active_workspace_id')?.value ?? null;
}

// Confirms the caller is authenticated and a member of the active workspace.
// Throws UnauthorizedError/ForbiddenError otherwise. Unlike getCurrentWorkspaceId
// (which only reads a client-supplied cookie with no verification at all), this
// actually checks a workspace_members row exists for the user — use this for
// any mutation/read of a specific record, not the cookie value alone.
export async function requireWorkspaceAccess(): Promise<{ userId: string; workspaceId: string }> {
 const supabase = await createServerClient();

 const { data: { user }, error: userError } = await supabase.auth.getUser();
 if (userError || !user) {
  throw new UnauthorizedError();
 }

 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) {
  throw new ForbiddenError('No active workspace');
 }

 const { data: membership } = await supabase
  .from('workspace_members')
  .select('id')
  .eq('workspace_id', workspaceId)
  .eq('user_id', user.id)
  .maybeSingle();

 if (!membership) {
  throw new ForbiddenError('Not a member of this workspace');
 }

 return { userId: user.id, workspaceId };
}

// ─────────────────────────────────────────────────────────────────────────────
// Form access (owner OR collaborator)
// ─────────────────────────────────────────────────────────────────────────────

export type FormAccessLevel = 'read' | 'write' | 'manage';

export interface FormAccessContext {
 userId: string;
 userEmail: string | null;
 formId: string;
 /** The form's own workspace_id — NOT necessarily the caller's active
  * workspace (a collaborator's own workspace is almost always different). */
 workspaceId: string;
 accessType: 'owner' | 'collaborator';
 collaboratorRole?: 'editor' | 'viewer';
}

// Confirms the caller can access a specific form, either as a member of the
// form's own workspace (existing/unchanged path — full access at every
// level) or as an active form_collaborators row for their email.
//
// Fixes a systemic bug found across getForm/updateForm and 5+ other
// form-scoped routes: they all gated on `workspace_id = the CALLER's own
// active workspace`, with zero awareness that a collaborator is invited
// cross-workspace by design (they are never a member of the form's
// workspace) — every one of those checks silently rejected every real
// collaborator, including the form's actual owner-invited editors/viewers.
// A handful of other routes had gone the opposite direction and applied no
// workspace check at all, open to any authenticated user; this closes both
// as one shared gate rather than a patch per call site.
//
// Levels:
//  - 'read': owner/workspace member OR any active collaborator (editor or viewer).
//  - 'write': owner/workspace member OR active collaborator with role='editor'.
//  - 'manage': owner/workspace member ONLY — collaborators never qualify
//    regardless of role (governance/invite/remove/role-update/delete).
//
// Throws UnauthorizedError/ForbiddenError otherwise, matching
// requireWorkspaceAccess()'s convention, so callers can catch-and-map to
// their existing { error } response shape without new plumbing.
export async function requireFormAccess(
 formId: string,
 requiredLevel: FormAccessLevel = 'read'
): Promise<FormAccessContext> {
 const supabase = await createServerClient();

 const { data: { user }, error: userError } = await supabase.auth.getUser();
 if (userError || !user) {
  throw new UnauthorizedError();
 }

 const adminSupabase = createAdminClient();
 const { data: form } = await adminSupabase
  .from('forms')
  .select('id, workspace_id')
  .eq('id', formId)
  .maybeSingle();

 if (!form) {
  throw new ForbiddenError('Form not found');
 }

 // Owner path: member of the form's own workspace — unchanged, full access
 // at every level.
 const { data: membership } = await supabase
  .from('workspace_members')
  .select('id')
  .eq('workspace_id', form.workspace_id)
  .eq('user_id', user.id)
  .maybeSingle();

 if (membership) {
  return {
   userId: user.id,
   userEmail: user.email ?? null,
   formId,
   workspaceId: form.workspace_id,
   accessType: 'owner',
  };
 }

 // 'manage' is owner-only — no collaborator role ever qualifies.
 if (requiredLevel === 'manage') {
  throw new ForbiddenError('Only the form owner or a workspace member can manage this form');
 }

 // Collaborator path: match by email (the invite/accept flow's own
 // identity key — a collaborator is not, and is not expected to be, a
 // workspace_members row for this workspace).
 if (!user.email) {
  throw new ForbiddenError('No access to this form');
 }

 const { data: collab } = await adminSupabase
  .from('form_collaborators')
  .select('role, status')
  .eq('form_id', formId)
  .ilike('email', user.email)
  .maybeSingle();

 if (!collab || collab.status !== 'active') {
  throw new ForbiddenError('No access to this form');
 }

 if (requiredLevel === 'write' && collab.role !== 'editor') {
  throw new ForbiddenError('You have read-only access to this form');
 }

 return {
  userId: user.id,
  userEmail: user.email,
  formId,
  workspaceId: form.workspace_id,
  accessType: 'collaborator',
  collaboratorRole: collab.role as 'editor' | 'viewer',
 };
}

export const getCurrentWorkspace = cache(async (existingUser?: any): Promise<Workspace | null> => {
 const user = existingUser || await getUser();
 if (!user) return null;

 const supabase = await createServerClient();
 let workspaceId = await getCurrentWorkspaceId();

 if (workspaceId) {
  // Validate that the user is actually a member of this workspace to avoid stale/out-of-sync cookies
  const { data: membership } = await supabase
   .from('workspace_members')
   .select('workspace_id')
   .eq('workspace_id', workspaceId)
   .eq('user_id', user.id)
   .maybeSingle();

  if (!membership) {
   workspaceId = null;
  }
 }

 // If no active workspace cookie or if it was invalid, find first membership
 if (!workspaceId) {
  const { data: membership } = await supabase
   .from('workspace_members')
   .select('workspace_id')
   .eq('user_id', user.id)
   .limit(1)
   .single();

  if (membership) {
   workspaceId = membership.workspace_id;
  }
 }

 if (!workspaceId) {
  // Auto-create a workspace as a last resort. Uses the setup_workspace RPC
  // so workspace creation + membership insert happen atomically (previously
  // two sequential, non-transactional inserts with no rollback on failure).
  const email = user.email ?? 'user';
  const name = `${(user.user_metadata?.full_name ?? email.split('@')[0])}'s Workspace`;
  const slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-') || 'workspace';

  const { data: newWorkspaceId, error: setupError } = await supabase.rpc('setup_workspace', {
   p_user_id: user.id,
   p_workspace_name: name,
   p_slug: slug,
  });

  if (setupError) {
   logger.error({ err: setupError, userId: user.id }, 'workspace.setup.failed');
  } else {
   logger.info({ workspaceId: newWorkspaceId, userId: user.id }, 'workspace.setup.success');
   workspaceId = newWorkspaceId;
  }
 }

 if (!workspaceId) return null;

 const { data, error } = await supabase
  .from('workspaces')
  .select('id, name, slug, logo_url, owner_id, plan_tier, created_at')
  .eq('id', workspaceId)
  .single();

 if (error || !data) {
  console.error('[auth] Failed to fetch workspace:', error);
  return null;
 }

 return {
  id: data.id,
  name: data.name,
  slug: data.slug,
  logoUrl: data.logo_url ?? null,
  ownerId: data.owner_id,
  plan: data.plan_tier as PlanTier,
  createdAt: data.created_at,
 };
});

// ─────────────────────────────────────────────────────────────────────────────
// Role & Memberships
// ─────────────────────────────────────────────────────────────────────────────

export async function getUserRole(): Promise<string | null> {
 const info = await getUserAccessInfo();
 return info.role;
}

export const getUserAccessInfo = cache(async (): Promise<{ role: string | null; permissions: string[] }> => {
  const user = await getUser();
  if (!user) return { role: null, permissions: [] };

  let workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
   const workspace = await getCurrentWorkspace(user);
   workspaceId = workspace?.id ?? null;
  }
  if (!workspaceId) return { role: null, permissions: [] };

  return getUserAccessInfoForWorkspace(user.id, workspaceId);
});

/**
 * Same lookup as getUserAccessInfo, but scoped to an explicitly-given workspace
 * rather than the cookie-derived "current" one. Use this whenever the workspace
 * being acted on can come from somewhere other than the user's own session
 * cookie (e.g. a `?workspaceId=` query param) — otherwise a role check against
 * the cookie's workspace can silently get paired with a resource lookup against
 * a *different* workspace, letting an admin of workspace A appear as an admin
 * of workspace B just because B happened to be the one in the URL.
 */
export const getUserAccessInfoForWorkspace = cache(async (userId: string, workspaceId: string): Promise<{ role: string | null; permissions: string[] }> => {
  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('workspace_members')
   .select('role, permissions')
   .eq('workspace_id', workspaceId)
   .eq('user_id', userId)
   .single();

  if (error || !data) return { role: null, permissions: [] };

  // Ensure permissions is an array of strings
  const permissions = Array.isArray(data.permissions) ? data.permissions : [];

  return { role: data.role, permissions };
});

export async function getUserRoleForWorkspace(workspaceId: string): Promise<string | null> {
 const user = await getUser();
 if (!user) return null;
 const info = await getUserAccessInfoForWorkspace(user.id, workspaceId);
 return info.role;
}

export async function requireAdmin() {
 const role = await getUserRole();
 if (role !== 'admin') {
  redirect('/403');
 }
}

export const getUserWorkspaces = cache(async () => {
 const user = await getUser();
 if (!user) return [];

 const supabase = await createServerClient();
 const { data, error } = await supabase
  .from('workspace_members')
  .select(`
   workspace_id,
   role,
   workspaces (
    id,
    name,
    logo_url
   )
  `)
  .eq('user_id', user.id);

 if (error || !data) {
  console.error('[auth] Error fetching user workspaces:', error);
  return [];
 }

 type WorkspaceQueryResult = {
  workspace_id: string;
  role: 'admin' | 'member' | 'client';
  workspaces: { id: string; name: string; logo_url: string | null } | null;
 };

 return (data as unknown as WorkspaceQueryResult[])
  .filter((item) => item.workspaces)
  .map((item) => ({
   id: item.workspaces!.id,
   name: item.workspaces!.name,
   logoUrl: item.workspaces!.logo_url,
   role: item.role,
  }));
});

// ─────────────────────────────────────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────────────────────────────────────

export async function logout() {
 const supabase = await createServerClient();
 await supabase.auth.signOut();

 const cookieStore = cookies();
 cookieStore.delete('active_workspace_id');

 redirect('/auth/signin-basic');
}
