

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createServerClient } from './supabase/server';
import { cookies } from 'next/headers';
import { logger } from '@/shared/logger';

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
 plan: 'free' | 'pro' | 'enterprise' | 'agency';
 createdAt: string;
}

export async function getCurrentWorkspaceId(): Promise<string | null> {
 const cookieStore = cookies();
 return cookieStore.get('active_workspace_id')?.value ?? null;
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
  plan: data.plan_tier as 'free' | 'pro' | 'enterprise' | 'agency',
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

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('workspace_members')
   .select('role, permissions')
   .eq('workspace_id', workspaceId)
   .eq('user_id', user.id)
   .single();

  if (error || !data) return { role: null, permissions: [] };
  
  // Ensure permissions is an array of strings
  const permissions = Array.isArray(data.permissions) ? data.permissions : [];
  
  return { role: data.role, permissions };
});

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
