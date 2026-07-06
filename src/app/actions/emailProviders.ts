'use server'

import { createAdminClient, createServerClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/encryption'
import { getWorkspaceEmailConfig } from '@/lib/email/resolveConfig'
import { sendEmail } from '@/lib/email'
import { logger } from '@/shared/logger'

// Confirms the caller is an authenticated member of the given workspace.
// These actions use createAdminClient (bypasses RLS) and take workspaceId
// directly from the client, so membership must be verified explicitly.
async function requireWorkspaceMember(workspaceId: string): Promise<boolean> {
  const authClient = await createServerClient()
  const { data: { user }, error } = await authClient.auth.getUser()
  if (error || !user) return false

  const { data: member } = await authClient
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  return !!member
}

export async function getEmailProvider(workspaceId: string) {
  if (!workspaceId) return { success: false, error: 'Workspace ID is required' }
  if (!(await requireWorkspaceMember(workspaceId))) {
    return { success: false, error: 'Unauthorized' }
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('workspace_email_providers')
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, workspaceId }, 'email_providers.get.failed')
    return { success: false, error: 'Failed to fetch email provider settings.' }
  }

  if (!data) {
    return { success: true, data: null }
  }

  let maskedKey = '••••••••••••••••'
  try {
    const rawKey = decrypt(data.encrypted_api_key)
    if (rawKey && rawKey.length > 4) {
      maskedKey = `••••••••••••${rawKey.slice(-4)}`
    }
  } catch (err) {
    logger.error({ err, workspaceId }, 'email_providers.key_decrypt.failed')
  }

  return {
    success: true,
    data: {
      provider: data.provider,
      apiKey: maskedKey,
      fromEmail: data.from_email,
      fromName: data.from_name || '',
      verified: data.verified,
      lastVerifiedAt: data.last_verified_at
    }
  }
}

export async function saveEmailProvider(
  workspaceId: string,
  payload: {
    apiKey: string
    fromEmail: string
    fromName?: string
  }
) {
  if (!workspaceId) return { success: false, error: 'Workspace ID is required' }
  if (!payload.fromEmail) {
    return { success: false, error: 'From Email is required' }
  }
  if (!(await requireWorkspaceMember(workspaceId))) {
    return { success: false, error: 'Unauthorized' }
  }

  const supabase = createAdminClient()

  const updatePayload: any = {
    workspace_id: workspaceId,
    provider: 'resend',
    from_email: payload.fromEmail.trim(),
    from_name: payload.fromName?.trim() || null,
    updated_at: new Date().toISOString()
  }

  // Only update API key if it's not the masked value
  if (payload.apiKey && !payload.apiKey.includes('••••')) {
    updatePayload.encrypted_api_key = encrypt(payload.apiKey)
    updatePayload.verified = false // reset verified flag on key change
  }

  const { error } = await supabase
    .from('workspace_email_providers')
    .upsert(updatePayload, {
      onConflict: 'workspace_id'
    })

  if (error) {
    logger.error({ err: error, workspaceId }, 'email_providers.save.failed')
    return { success: false, error: 'Failed to save email provider settings.' }
  }

  return { success: true }
}

export async function verifyEmailProvider(workspaceId: string) {
  if (!workspaceId) return { success: false, error: 'Workspace ID is required' }
  if (!(await requireWorkspaceMember(workspaceId))) {
    return { success: false, error: 'Unauthorized' }
  }

  const supabase = createAdminClient()
  const config = await getWorkspaceEmailConfig(workspaceId)
  if (!config) {
    return { success: false, error: 'No email provider configuration found' }
  }

  try {
    // Send verification test email
    await sendEmail({
      to: config.fromEmail,
      subject: 'LeadsMind — Email Provider Test Verification',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #0b1310; color: #ffffff;">
          <h2 style="color: #3b82f6;">Email Verification Successful!</h2>
          <p>Your custom Resend integration has been successfully verified for workspace notifications.</p>
          <hr style="border-color: rgba(255,255,255,0.1);" />
          <p style="font-size: 12px; color: #a0aec0;">This is an automated verification check sent by LeadsMind.</p>
        </div>
      `,
      config
    })

    const { error: updateError } = await supabase
      .from('workspace_email_providers')
      .update({
        verified: true,
        last_verified_at: new Date().toISOString()
      })
      .eq('workspace_id', workspaceId)

    if (updateError) throw updateError

    return { success: true }
  } catch (err: any) {
    logger.error({ err, workspaceId }, 'email_providers.verify.failed')
    return { success: false, error: 'Failed to send test verification email' }
  }
}
