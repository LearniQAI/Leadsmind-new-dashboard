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
    plan_tier: 'free',
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

