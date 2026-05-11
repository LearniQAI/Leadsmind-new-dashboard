'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function respondToReview(reviewId: string, response: string) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('reviews')
   .update({
    owner_response: response,
    is_responded: true,
    responded_at: new Date().toISOString()
   })
   .eq('id', reviewId)
   .eq('workspace_id', workspaceId)
   .select()
   .single();

  if (error) throw error;
  revalidatePath('/reputation');
  return { data };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function deleteReview(reviewId: string) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { error } = await supabase
   .from('reviews')
   .delete()
   .eq('id', reviewId)
   .eq('workspace_id', workspaceId);

  if (error) throw error;
  revalidatePath('/reputation');
  return { success: true };
 } catch (error: any) {
  return { error: error.message };
 }
}
