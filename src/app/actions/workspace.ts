'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getUser } from '@/lib/auth';
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
        plan: 'free',
      })
      .select('id, name')
      .single();

    if (workspaceError) {
      console.error('[createWorkspace] Error:', workspaceError);
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
      console.error('[createWorkspace] Member error:', memberError);
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
    console.error('[createWorkspace] Unexpected error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
