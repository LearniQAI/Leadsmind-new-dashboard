'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/email';
import { cookies } from 'next/headers';

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

/**
 * Called after signup. Creates the user profile + workspace in our DB tables.
 */
export async function setupWorkspace(payload: {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  workspaceName: string;
}) {
  const supabase = await createServerClient();

  try {
    // 1. Upsert user record
    const { error: userError } = await supabase
      .from('users')
      .upsert(
        {
          id: payload.userId,
          email: payload.email,
          first_name: payload.firstName,
          last_name: payload.lastName,
        },
        { onConflict: 'id', ignoreDuplicates: true }
      );

    if (userError) {
      console.warn('[setupWorkspace] User upsert warning:', userError.message);
    }

    // 2. Check if user already has a workspace
    const { data: existingMembership } = await supabase
      .from('workspace_members')
      .select('workspace_id, workspaces(id, name)')
      .eq('user_id', payload.userId)
      .limit(1)
      .single();

    if (existingMembership) {
      const ws = existingMembership.workspaces as unknown as { id: string; name: string };
      return { success: true, workspaceId: ws?.id || existingMembership.workspace_id };
    }

    // 3. Create workspace
    const baseSlug = slugify(payload.workspaceName);
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name: payload.workspaceName,
        slug,
        owner_id: payload.userId,
        plan: 'free',
      })
      .select('id, name')
      .single();

    if (workspaceError) {
      console.error('[setupWorkspace] Workspace creation error:', workspaceError);
      return { success: false, error: 'Failed to create workspace' };
    }

    // 4. Add as admin member
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({ workspace_id: workspace.id, user_id: payload.userId, role: 'admin' });

    if (memberError) {
      console.warn('[setupWorkspace] Member insert warning:', memberError.message);
    }

    revalidatePath('/dashboard', 'layout');

    // Send Welcome Email
    try {
      await sendEmail({
        to: payload.email,
        subject: `Welcome to LeadsMind, ${payload.firstName}!`,
        html: `<h1>Welcome to LeadsMind</h1><p>Hi ${payload.firstName}, your workspace <strong>${payload.workspaceName}</strong> is ready.</p>`
      });
    } catch (emailErr) {
      console.error('[setupWorkspace] Welcome email failed:', emailErr);
    }

    return { success: true, workspaceId: workspace.id };
  } catch (err) {
    console.error('[setupWorkspace] Unexpected error:', err);
    return { success: false, error: 'An unexpected error occurred during workspace setup' };
  }
}

export async function setActiveWorkspace(workspaceId: string) {
  const cookieStore = await cookies();
  cookieStore.set('active_workspace_id', workspaceId, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  });
  
  return { success: true };
}

export async function forgotPassword(email: string) {
  const supabase = await createServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/reset-password`,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function resetPassword(password: string) {
  const supabase = await createServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function handleLogout() {
  const { logout } = await import('@/lib/auth');
  await logout();
}
