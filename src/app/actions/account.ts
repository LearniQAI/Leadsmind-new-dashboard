'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { profileSchema, passwordSchema, ProfileFormValues, PasswordFormValues } from '@/lib/validations/account.schema';
import { getUser, getCurrentWorkspaceId } from '@/lib/auth';
import { ForbiddenError, UnauthorizedError } from '@/lib/errors';
import { generateAvatarPng } from '@/lib/avatar/generateAvatarPng';

export async function updateProfile(values: ProfileFormValues) {
 const user = await getUser();
 if (!user) return { success: false, error: 'Unauthorized' };

 const validated = profileSchema.safeParse(values);
 if (!validated.success) return { success: false, error: 'Invalid data' };

 const supabase = await createServerClient();
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) throw new ForbiddenError('No active workspace');
 
 const { error } = await supabase
  .from('users')
  .update({
   first_name: values.firstName,
   last_name: values.lastName,
   avatar_url: values.avatarUrl,
   avatar_preset_id: values.avatarPresetId || null,
   job_title: values.jobTitle || null,
   phone: values.phone || null,
   profile_photo_url: values.profilePhotoUrl || null,
   identity_color: values.identityColor || '#3b82f6',
  })
  .eq("id", user.id).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId);

 if (error) return { success: false, error: error.message };

 // Compile and upload new fallback initials avatar
 try {
  const initials = ((values.firstName[0] || '') + (values.lastName ? values.lastName[0] || '' : '')).toUpperCase() || 'LM';
  const bgColor = values.identityColor || '#3b82f6';
  const pngBuffer = await generateAvatarPng(initials, bgColor);
  
  const adminSupabase = createAdminClient();
  const { data: memberships } = await adminSupabase
   .from('workspace_members')
   .select('workspace_id')
   .eq('user_id', user.id);

  for (const m of (memberships || [])) {
   await adminSupabase.storage
    .from('avatars')
    .upload(`${m.workspace_id}/${user.id}/email-avatar.png`, pngBuffer, {
     contentType: 'image/png',
     upsert: true
    });
  }
 } catch (avatarErr) {
  console.error('[Avatar Auto Generator Fallback Failed]:', avatarErr);
 }

 revalidatePath('/', 'layout');
 return { success: true };
}

export async function updatePassword(values: PasswordFormValues) {
 const user = await getUser();
 if (!user) return { success: false, error: 'Unauthorized' };

 const validated = passwordSchema.safeParse(values);
 if (!validated.success) return { success: false, error: 'Invalid data' };

 const supabase = await createServerClient();

 const { error } = await supabase.auth.updateUser({
  password: values.newPassword,
 });

 if (error) return { success: false, error: error.message };

 return { success: true };
}
