'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';

export async function inviteFormCollaborator({
  email,
  formId,
  formName,
  role
}: {
  email: string;
  formId: string;
  formName: string;
  role: 'editor' | 'viewer';
}) {
  try {
    const supabase = await createServerClient();
    const adminSupabase = createAdminClient();
    
    // Get the current user (owner/inviter)
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return { error: 'Unauthorized' };

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No active workspace' };

    // 1. Resolve user ID by email
    const { data: targetUser, error: findError } = await adminSupabase
      .from('users')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (findError) {
      console.error('[inviteFormCollaborator] Find user error:', findError);
      return { error: 'Database error searching for user' };
    }

    if (!targetUser) {
      return { error: `User with email ${email} not found on LeadsMind.` };
    }

    // 2. Insert notification into public.notifications table
    const { error: notifError } = await adminSupabase
      .from('notifications')
      .insert({
        workspace_id: workspaceId,
        user_id: targetUser.id,
        type: 'team',
        title: 'Form Collaboration',
        message: `${currentUser.email} invited you to collaborate on form "${formName}"`,
        link: `/forms/${formId}/governance`,
        read: false
      });

    if (notifError) {
      console.error('[inviteFormCollaborator] Notification insert error:', notifError);
      return { error: 'Failed to create real-time notification' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[inviteFormCollaborator] Error:', error);
    return { error: error.message || 'Invitation failed' };
  }
}
