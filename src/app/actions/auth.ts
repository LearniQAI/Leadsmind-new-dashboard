'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/email';
import { sendPasswordResetEmail } from '@/lib/auth-emails';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/shared/logger';

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
   logger.warn({ err: userError, userId: payload.userId }, 'auth.setup_workspace.user_upsert.warning');
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

  // 3. Create workspace + admin membership atomically via the setup_workspace
  // RPC (workspace insert + member insert happen in one transaction — no
  // partial state if either step fails).
  const slug = slugify(payload.workspaceName);

  const { data: workspaceId, error: setupError } = await supabase.rpc('setup_workspace', {
   p_user_id: payload.userId,
   p_workspace_name: payload.workspaceName,
   p_slug: slug,
  });

  if (setupError) {
   logger.error({ err: setupError, userId: payload.userId }, 'auth.setup_workspace.rpc.failed');
   return { success: false, error: 'Failed to create workspace' };
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
   logger.error({ err: emailErr, email: payload.email }, 'auth.setup_workspace.welcome_email.failed');
  }

  return { success: true, workspaceId };
 } catch (err) {
  logger.error({ err, userId: payload.userId }, 'auth.setup_workspace.failed');
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
 // Use service role to generate the link (bypass default Supabase email)
 const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
 );

 try {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
   type: 'recovery',
   email,
   options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/reset-password` }
  });

  if (error) throw error;

  // Send branded email via Resend
  await sendPasswordResetEmail(email, data.properties.hashed_token);

  return { success: true };
 } catch (error: any) {
  logger.error({ err: error, email }, 'auth.forgot_password.failed');
  return { success: false, error: 'Unable to process password reset request. Please try again.' };
 }
}

export async function resetPassword(password: string) {
 const supabase = await createServerClient();
 const { error } = await supabase.auth.updateUser({ password });
 if (error) {
  logger.error({ err: error }, 'auth.reset_password.failed');
  return { success: false, error: 'Failed to reset password. Please try again.' };
 }
 return { success: true };
}

export async function handleLogout() {
 const { logout } = await import('@/lib/auth');
 await logout();
}

/**
 * Notifies the user via email that a sign-in occurred.
 */
export async function notifySignIn(email: string) {
 try {
  await sendEmail({
   to: email,
   subject: 'New Login Detected',
   html: `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
     <h2 style="color: #6c47ff;">New Login to LeadsMind</h2>
     <p>Hello,</p>
     <p>A new login was detected for your account at <strong>${new Date().toLocaleString()}</strong>.</p>
     <p>If this was not you, please reset your password immediately.</p>
     <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
     <p style="font-size: 12px; color: #666;">This is a security notification from LeadsMind.</p>
    </div>
   `
  });
  return { success: true };
 } catch (err) {
  logger.error({ err, email }, 'auth.notify_sign_in.failed');
  return { success: false };
 }
}

/**
 * Sends a generic update notification.
 */
export async function notifyUpdate(email: string, updateTitle: string, updateDetails: string) {
 try {
  await sendEmail({
   to: email,
   subject: `System Update: ${updateTitle}`,
   html: `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
     <h2 style="color: #6c47ff;">Update Notification</h2>
     <p>Hello,</p>
     <p>An update has occurred: <strong>${updateTitle}</strong></p>
     <p>${updateDetails}</p>
     <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
     <p style="font-size: 12px; color: #666;">You are receiving this because you opted into update notifications.</p>
    </div>
   `
  });
  return { success: true };
 } catch (err) {
  logger.error({ err, email }, 'auth.notify_update.failed');
  return { success: false };
 }
}

/**
 * Resolves a username (first name) or email prefix to the registered email address.
 */
export async function getEmailByUsername(username: string) {
 try {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || serviceKey === 'your_supabase_service_role_key' || serviceKey.startsWith('your_')) {
   logger.warn({}, 'auth.get_email_by_username.service_key_missing');
   return { success: false, error: 'Username login is currently unavailable. Please sign in using your email address.' };
  }

  const supabaseAdmin = createClient(
   process.env.NEXT_PUBLIC_SUPABASE_URL!,
   serviceKey,
   { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const cleanUsername = username.trim();
  if (!cleanUsername) {
   return { success: false, error: 'Username is empty' };
  }

  // Find user by first_name matching the username, or email starting with username@
  const { data, error } = await supabaseAdmin
   .from('users')
   .select('email')
   .or(`first_name.ilike.${cleanUsername},email.ilike.${cleanUsername}@%`)
   .limit(1)
   .maybeSingle();

  if (error) {
   logger.error({ err: error, username: cleanUsername }, 'auth.get_email_by_username.query.failed');
   return { success: false, error: 'Unable to look up username. Please try again.' };
  }

  if (!data) {
   return { success: false, error: 'User not found' };
  }

  return { success: true, email: data.email };
 } catch (err: any) {
  logger.error({ err, username }, 'auth.get_email_by_username.failed');
  return { success: false, error: 'Unable to look up username. Please try again.' };
 }
}
