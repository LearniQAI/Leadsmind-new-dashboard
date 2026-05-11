'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';

export async function getCourses() {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('courses')
   .select('*, modules:course_modules(count)')
   .eq('workspace_id', workspaceId)
   .order('created_at', { ascending: false });

  if (error) throw error;
  return { data };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function createCourse(title: string) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('courses')
   .insert({
    workspace_id: workspaceId,
    title,
    status: 'draft'
   })
   .select()
   .single();

  if (error) throw error;
  return { data };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function getForumPosts() {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('forum_posts')
   .select('*, author:auth.users(email)')
   .eq('workspace_id', workspaceId)
   .is('parent_id', null)
   .order('created_at', { ascending: false });

  if (error) throw error;
  return { data };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function enrollStudent(courseId: string, contactId: string) {
 try {
  const supabase = await createServerClient();
  const { error } = await supabase
   .from('enrollments')
   .upsert({ course_id: courseId, contact_id: contactId, status: 'active' });

  if (error) throw error;
  return { success: true };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function updateProgress(contactId: string, lessonId: string, completed: boolean, progress: number) {
 try {
  // Progress tracking logic
  return { success: true };
 } catch (error: any) {
  return { error: error.message };
 }
}
