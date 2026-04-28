"use server";

import { redirect } from 'next/navigation';
import { createServerClient } from './supabase/server';
import { cookies } from 'next/headers';

// ─────────────────────────────────────────────────────────────────────────────
// Session & User
// ─────────────────────────────────────────────────────────────────────────────

export async function getSession() {
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
}

export async function getUser() {
  const supabase = await createServerClient();
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) return null;
    return user;
  } catch (error) {
      return null;
  }
}

export async function requireAuth() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
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

export async function getCurrentProfile(existingUser?: any): Promise<UserProfile | null> {
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
    const { data: created } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email ?? '',
        first_name: (user.user_metadata?.full_name ?? user.email ?? '').split(' ')[0] ?? '',
        last_name: '',
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
}

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
  const cookieStore = await cookies();
  return cookieStore.get('active_workspace_id')?.value ?? null;
}

export async function getCurrentWorkspace(existingUser?: any): Promise<Workspace | null> {
  const user = existingUser || await getUser();
  if (!user) return null;

  const supabase = await createServerClient();
  let workspaceId = await getCurrentWorkspaceId();

  // If no active workspace cookie, find first membership
  if (!workspaceId) {
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (membership) {
      workspaceId = membership.workspace_id;
      // Persist the cookie for future requests
      const cookieStore = await cookies();
      try {
        cookieStore.set('active_workspace_id', workspaceId!, {
          maxAge: 60 * 60 * 24 * 30,
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
        });
      } catch {
        // Cookie set may fail in Server Components — ignore
      }
    }
  }

  if (!workspaceId) {
    // Auto-create a workspace as a last resort
    const email = user.email ?? 'user';
    const name = `${(user.user_metadata?.full_name ?? email.split('@')[0])}'s Workspace`;
    const slug = `${email.split('@')[0].replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now().toString(36)}`;

    const { data: ws } = await supabase
      .from('workspaces')
      .insert({ name, slug, owner_id: user.id, plan: 'free' })
      .select()
      .single();

    if (ws) {
      await supabase
        .from('workspace_members')
        .insert({ workspace_id: ws.id, user_id: user.id, role: 'admin' });
      workspaceId = ws.id;
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
}

// ─────────────────────────────────────────────────────────────────────────────
// Role & Memberships
// ─────────────────────────────────────────────────────────────────────────────

export async function getUserRole(): Promise<string | null> {
  const user = await getUser();
  if (!user) return null;

  let workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    const workspace = await getCurrentWorkspace(user);
    workspaceId = workspace?.id ?? null;
  }
  if (!workspaceId) return null;

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();

  if (error || !data) return null;
  return data.role;
}

export async function requireAdmin() {
  const role = await getUserRole();
  if (role !== 'admin') {
    redirect('/403');
  }
}

export async function getUserWorkspaces() {
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
}

// ─────────────────────────────────────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────────────────────────────────────

export async function logout() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete('active_workspace_id');

  redirect('/login');
}
