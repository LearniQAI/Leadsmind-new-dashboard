'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/email';
import type { InviteActionResponse } from '@/types/invitation.types';

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
}): Promise<InviteActionResponse> {
  try {
    const supabase = await createServerClient();
    const adminSupabase = createAdminClient();
    
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return { error: 'Unauthorized' };

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No active workspace' };

    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail.includes('@')) return { error: 'Invalid email address' };

    const { data: targetUser } = await adminSupabase
      .from('users')
      .select('id')
      .eq('email', targetEmail)
      .maybeSingle();

    if (!targetUser) {
      return { error: `User with email ${targetEmail} not found on LeadsMind.` };
    }

    if (targetUser.id === currentUser.id) {
      return { error: 'You cannot invite yourself to a form.' };
    }

    const { data: existing } = await adminSupabase
      .from('form_collaborators')
      .select('id, status')
      .eq('form_id', formId)
      .eq('email', targetEmail)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'active') {
        return { error: 'This user is already an active collaborator on this form.' };
      }
      if (existing.status === 'pending') {
        return { error: 'A pending invitation already exists for this user.' };
      }
    }

    const { error: collabError } = await adminSupabase
      .from('form_collaborators')
      .upsert({
        form_id: formId,
        invited_by: currentUser.id,
        email: targetEmail,
        role: role,
        status: 'pending'
      }, {
        onConflict: 'form_id,email'
      });

    if (collabError) {
      return { error: 'Failed to create invitation. Please try again.' };
    }

    const { error: notifError } = await adminSupabase
      .from('notifications')
      .insert({
        workspace_id: workspaceId,
        user_id: targetUser.id,
        type: 'team',
        title: 'Form Collaboration Invite',
        message: `${currentUser.email} invited you to collaborate on "${formName}" as ${role}`,
        link: `/forms?tab=collaborations`,
        read: false
      });

    if (notifError) {
      console.error('[inviteFormCollaborator] Notification insert error:', notifError);
    }

    try {
      const link = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/forms?tab=collaborations`;
      await sendEmail({
        to: targetEmail,
        subject: `You've been invited to collaborate on "${formName}"`,
        html: `
          <div style="font-family: 'DM Sans', sans-serif; max-width: 560px; margin: 0 auto; background: #04091a; border-radius: 20px; border: 1px solid rgba(37,99,235,0.3); overflow: hidden;">
            <div style="padding: 40px 36px 24px; background: linear-gradient(180deg, #0c1535 0%, #04091a 100%);">
              <h1 style="font-family: 'Space Grotesk', sans-serif; font-size: 22px; font-weight: 700; margin: 0 0 4px; color: #eef2ff;">
                Collaboration <span style="color: #3b82f6;">Invite</span>
              </h1>
              <p style="color: #4a5a82; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 28px;">LeadsMind Form Access</p>
              <p style="color: #94a3c8; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                <strong style="color: #eef2ff;">${currentUser.email}</strong> has invited you to collaborate on the form <strong style="color: #3b82f6;">"${formName}"</strong>.
              </p>
              <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 4px; font-size: 10px; color: #4a5a82; text-transform: uppercase; letter-spacing: 1.5px;">Your Role</p>
                <p style="margin: 0; font-size: 18px; font-weight: 700; color: #3b82f6; font-family: 'Space Grotesk', sans-serif;">${role.toUpperCase()}</p>
                <p style="margin: 8px 0 0; font-size: 12px; color: #4a5a82;">${role === 'editor' ? 'Full edit access to form fields and settings.' : 'Read-only view of form data and submissions.'}</p>
              </div>
              <a href="${link}" style="display: inline-block; padding: 16px 48px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-family: 'Space Grotesk', sans-serif;">Accept Invitation</a>
              <p style="color: #4a5a82; font-size: 11px; margin-top: 16px;">This invitation expires in 7 days.</p>
            </div>
            <div style="padding: 20px 36px; border-top: 1px solid rgba(255,255,255,0.05); background: #080f28;">
              <p style="margin: 0; color: #2a3557; font-size: 10px; text-align: center;">LeadsMind — Smart Form Builder</p>
            </div>
          </div>
        `
      });
    } catch (emailError: any) {
      console.error('[inviteFormCollaborator] Email sending failed:', emailError);
      revalidatePath('/forms');
      revalidatePath(`/forms/${formId}/governance`);
      return { success: true, warning: 'Invitation saved but email failed to send. Check Resend config.' };
    }

    revalidatePath('/forms');
    revalidatePath(`/forms/${formId}/governance`);
    return { success: true };
  } catch (error: any) {
    console.error('[inviteFormCollaborator] Error:', error);
    return { error: error.message || 'Invitation failed' };
  }
}

export async function acceptFormInvitation(collabId: string): Promise<InviteActionResponse> {
  try {
    const adminSupabase = createAdminClient();

    const { data: existing } = await adminSupabase
      .from('form_collaborators')
      .select('id, status, form_id, email')
      .eq("id", collabId).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId)
      .single();

    if (!existing) return { error: 'Invitation not found.' };
    if (existing.status === 'active') return { error: 'This invitation has already been accepted.' };
    if (existing.status !== 'pending') return { error: 'This invitation is no longer valid.' };

    const { error } = await adminSupabase
      .from('form_collaborators')
      .update({ status: 'active' })
      .eq("id", collabId).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId);

    if (error) throw error;

    revalidatePath('/forms');
    return { success: true };
  } catch (error: any) {
    console.error('[acceptFormInvitation] Error:', error);
    return { error: error.message || 'Failed to accept invitation' };
  }
}

export async function declineFormInvitation(collabId: string): Promise<InviteActionResponse> {
  try {
    const adminSupabase = createAdminClient();

    const { data: existing } = await adminSupabase
      .from('form_collaborators')
      .select('id, status')
      .eq("id", collabId).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId)
      .single();

    if (!existing) return { error: 'Invitation not found.' };
    if (existing.status !== 'pending') return { error: 'Can only decline pending invitations.' };

    const { error } = await adminSupabase
      .from('form_collaborators')
      .update({ status: 'declined' })
      .eq("id", collabId).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId);

    if (error) throw error;

    revalidatePath('/forms');
    return { success: true };
  } catch (error: any) {
    console.error('[declineFormInvitation] Error:', error);
    return { error: error.message || 'Failed to decline invitation' };
  }
}

export async function resendFormInvitation(collabId: string, formId: string): Promise<InviteActionResponse> {
  try {
    const adminSupabase = createAdminClient();
    const supabase = await createServerClient();

    const { data: collab } = await adminSupabase
      .from('form_collaborators')
      .select('id, email, role, status')
      .eq('id', collabId)
      .single();

    if (!collab) return { error: 'Invitation not found.' };
    if (collab.status !== 'pending') return { error: 'Can only resend pending invitations.' };

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return { error: 'Unauthorized' };

    const { data: form } = await supabase
      .from('forms')
      .select('name')
      .eq('id', formId)
      .single();

    const formName = form?.name || 'Untitled Form';

    const link = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/forms?tab=collaborations`;
    await sendEmail({
      to: collab.email,
      subject: `Reminder: You're invited to collaborate on "${formName}"`,
      html: `
        <div style="font-family: 'DM Sans', sans-serif; max-width: 560px; margin: 0 auto; background: #04091a; border-radius: 20px; border: 1px solid rgba(37,99,235,0.3); overflow: hidden;">
          <div style="padding: 40px 36px 24px; background: linear-gradient(180deg, #0c1535 0%, #04091a 100%);">
            <h1 style="font-family: 'Space Grotesk', sans-serif; font-size: 22px; font-weight: 700; margin: 0 0 4px; color: #eef2ff;">
              Reminder: <span style="color: #3b82f6;">Invite</span>
            </h1>
            <p style="color: #4a5a82; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 28px;">Form Collaboration Access</p>
            <p style="color: #94a3c8; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
              <strong style="color: #eef2ff;">${currentUser.email}</strong> sent you a reminder about collaborating on <strong style="color: #3b82f6;">"${formName}"</strong>.
            </p>
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 20px; margin-bottom: 24px;">
              <p style="margin: 0 0 4px; font-size: 10px; color: #4a5a82; text-transform: uppercase; letter-spacing: 1.5px;">Your Role</p>
              <p style="margin: 0; font-size: 18px; font-weight: 700; color: #3b82f6; font-family: 'Space Grotesk', sans-serif;">${collab.role.toUpperCase()}</p>
            </div>
            <a href="${link}" style="display: inline-block; padding: 16px 48px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-family: 'Space Grotesk', sans-serif;">Accept Invitation</a>
          </div>
          <div style="padding: 20px 36px; border-top: 1px solid rgba(255,255,255,0.05); background: #080f28;">
            <p style="margin: 0; color: #2a3557; font-size: 10px; text-align: center;">LeadsMind — Smart Form Builder</p>
          </div>
        </div>
      `
    });

    return { success: true };
  } catch (error: any) {
    console.error('[resendFormInvitation] Error:', error);
    return { error: error.message || 'Failed to resend invitation' };
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
    return { error: error.message || 'Failed to fetch collaborators' };
  }
}

export async function removeFormCollaborator(collabId: string, formId: string) {
  try {
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from('form_collaborators')
      .update({ status: 'removed' })
      .eq("id", collabId).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId);

    if (error) throw error;
    
    revalidatePath('/forms');
    revalidatePath(`/forms/${formId}/governance`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to remove collaborator' };
  }
}

export async function updateFormCollaboratorRole(collabId: string, role: 'editor' | 'viewer', formId: string) {
  try {
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from('form_collaborators')
      .update({ role })
      .eq("id", collabId).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId);

    if (error) throw error;

    revalidatePath('/forms');
    revalidatePath(`/forms/${formId}/governance`);
    return { success: true };
  } catch (error: any) {
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

    if (err1) throw err1;

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

    if (err2) throw err2;

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

export async function sendInviteNotificationAfterAcceptance(collabId: string) {
  try {
    const adminSupabase = createAdminClient();
    const supabase = await createServerClient();

    const { data: collab } = await adminSupabase
      .from('form_collaborators')
      .select('id, form_id, email, invited_by')
      .eq('id', collabId)
      .single();

    if (!collab) return { error: 'Collaborator not found' };

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No active workspace' };

    const { data: form } = await supabase
      .from('forms')
      .select('name')
      .eq('id', collab.form_id)
      .single();

    const formName = form?.name || 'Untitled Form';

    const { data: inviter } = await adminSupabase
      .from('users')
      .select('id, email')
      .eq('id', collab.invited_by)
      .single();

    if (inviter) {
      await adminSupabase.from('notifications').insert({
        workspace_id: workspaceId,
        user_id: inviter.id,
        type: 'team',
        title: 'Invitation Accepted',
        message: `${collab.email} accepted your invitation to collaborate on "${formName}"`,
        link: `/forms/${collab.form_id}/governance`,
        read: false
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('[sendInviteNotificationAfterAcceptance] Error:', error);
    return { error: error.message };
  }
}
