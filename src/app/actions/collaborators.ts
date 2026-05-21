'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/email';

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

    const targetEmail = email.trim().toLowerCase();

    // 1. Resolve user ID by email
    const { data: targetUser, error: findError } = await adminSupabase
      .from('users')
      .select('id')
      .eq('email', targetEmail)
      .maybeSingle();

    if (findError) {
      console.error('[inviteFormCollaborator] Find user error:', findError);
      return { error: 'Database error searching for user' };
    }

    if (!targetUser) {
      return { error: `User with email ${email} not found on LeadsMind.` };
    }

    // 2. Insert into form_collaborators table (persistent record)
    const { error: collabError } = await adminSupabase
      .from('form_collaborators')
      .upsert({
        form_id: formId,
        invited_by: currentUser.id,
        email: targetEmail,
        role: role,
        status: 'active' // Auto-active since the account already exists
      }, {
        onConflict: 'form_id,email'
      });

    if (collabError) {
      console.error('[inviteFormCollaborator] Collaborator insert/upsert error:', collabError);
      return { error: 'Failed to add collaborator' };
    }

    // 3. Insert notification into public.notifications table
    const { error: notifError } = await adminSupabase
      .from('notifications')
      .insert({
        workspace_id: workspaceId,
        user_id: targetUser.id,
        type: 'team',
        title: 'Form Collaboration Invite',
        message: `${currentUser.email} invited you to collaborate on form "${formName}"`,
        link: `/forms/${formId}/governance`,
        read: false
      });

    if (notifError) {
      console.error('[inviteFormCollaborator] Notification insert error:', notifError);
      // Don't fail the whole action if only notification failed
    }

    // 4. Send beautiful HTML email
    try {
      const link = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/forms/${formId}/governance`;
      await sendEmail({
        to: targetEmail,
        subject: `You have been invited to collaborate on "${formName}"`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #2563eb; border-radius: 16px; background-color: #04091a; color: #eef2ff;">
            <h2 style="color: #3b82f6; font-size: 24px;">Form <span style="color: #ffffff;">Collaboration</span></h2>
            <p style="color: #94a3c8; font-size: 14px;">You have been invited by <strong>${currentUser.email}</strong> to collaborate on the form <strong>"${formName}"</strong>.</p>
            <div style="margin: 24px 0; padding: 20px; background-color: rgba(255,255,255,0.05); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
              <p style="margin: 0; font-size: 12px; color: #4a5a82; text-transform: uppercase; letter-spacing: 1px;">Granted Access Role</p>
              <p style="margin: 8px 0 0; font-size: 16px; font-weight: bold; color: #3b82f6;">${role.toUpperCase()}</p>
            </div>
            <p style="color: #94a3c8;">Click the button below to open the form governance dashboard:</p>
            <div style="margin: 30px 0;">
              <a href="${link}" 
                style="display: inline-block; padding: 14px 40px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                Open Form
              </a>
            </div>
          </div>
        `
      });
    } catch (emailError) {
      console.error('[inviteFormCollaborator] Email sending failed:', emailError);
    }

    revalidatePath('/forms');
    revalidatePath(`/forms/${formId}/governance`);

    return { success: true };
  } catch (error: any) {
    console.error('[inviteFormCollaborator] Error:', error);
    return { error: error.message || 'Invitation failed' };
  }
}

export async function getFormCollaborators(formId: string) {
  try {
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from('form_collaborators')
      .select('*')
      .eq('form_id', formId);

    if (error) throw error;
    return { data };
  } catch (error: any) {
    console.error('[getFormCollaborators] Error:', error);
    return { error: error.message || 'Failed to fetch collaborators' };
  }
}

export async function removeFormCollaborator(collabId: string, formId: string) {
  try {
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from('form_collaborators')
      .delete()
      .eq('id', collabId);

    if (error) throw error;
    
    revalidatePath(`/forms/${formId}/governance`);
    return { success: true };
  } catch (error: any) {
    console.error('[removeFormCollaborator] Error:', error);
    return { error: error.message || 'Failed to remove collaborator' };
  }
}

export async function updateFormCollaboratorRole(collabId: string, role: 'editor' | 'viewer', formId: string) {
  try {
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from('form_collaborators')
      .update({ role })
      .eq('id', collabId);

    if (error) throw error;

    revalidatePath(`/forms/${formId}/governance`);
    return { success: true };
  } catch (error: any) {
    console.error('[updateFormCollaboratorRole] Error:', error);
    return { error: error.message || 'Failed to update role' };
  }
}

export async function getUserCollaborations() {
  try {
    const supabase = await createServerClient();
    const adminSupabase = createAdminClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const userEmail = user.email?.toLowerCase();
    if (!userEmail) return { error: 'User email not found' };

    // 1. Fetch forms where YOU were invited by others
    const { data: invitedTo, error: err1 } = await adminSupabase
      .from('form_collaborators')
      .select(`
        id,
        role,
        status,
        created_at,
        form_id,
        form:forms (
          id,
          name,
          status
        ),
        invited_by
      `)
      .eq('email', userEmail);

    if (err1) {
      console.error('[getUserCollaborations] Fetch invitedTo error:', err1);
      throw err1;
    }

    // 2. Fetch forms where YOU invited others
    const { data: invitedOthers, error: err2 } = await adminSupabase
      .from('form_collaborators')
      .select(`
        id,
        email,
        role,
        status,
        created_at,
        form_id,
        form:forms (
          id,
          name,
          status
        )
      `)
      .eq('invited_by', user.id);

    if (err2) {
      console.error('[getUserCollaborations] Fetch invitedOthers error:', err2);
      throw err2;
    }

    // Resolve inviter emails manually to be secure and fast
    const inviterIds = Array.from(new Set(invitedTo?.map(item => item.invited_by).filter(Boolean) || []));
    let inviterMap: Record<string, string> = {};
    if (inviterIds.length > 0) {
      const { data: users } = await adminSupabase
        .from('users')
        .select('id, email')
        .in('id', inviterIds);
      
      if (users) {
        users.forEach(u => {
          inviterMap[u.id] = u.email;
        });
      }
    }

    const formattedInvitedTo = (invitedTo || []).map(item => ({
      id: item.id,
      role: item.role,
      status: item.status,
      createdAt: item.created_at,
      formId: item.form_id,
      formName: (item.form as any)?.name || 'Deleted Form',
      formStatus: (item.form as any)?.status || 'draft',
      invitedByEmail: inviterMap[item.invited_by] || 'System'
    }));

    const formattedInvitedOthers = (invitedOthers || []).map(item => ({
      id: item.id,
      email: item.email,
      role: item.role,
      status: item.status,
      createdAt: item.created_at,
      formId: item.form_id,
      formName: (item.form as any)?.name || 'Deleted Form',
      formStatus: (item.form as any)?.status || 'draft'
    }));

    return {
      data: {
        invitedTo: formattedInvitedTo,
        invitedOthers: formattedInvitedOthers
      }
    };
  } catch (error: any) {
    console.error('[getUserCollaborations] Error:', error);
    return { error: error.message || 'Failed to fetch collaborations' };
  }
}
