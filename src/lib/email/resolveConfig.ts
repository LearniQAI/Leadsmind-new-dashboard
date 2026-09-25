import { createAdminClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'
import { signManagedSenderToken } from '@/lib/email/managedSender'
import { resolveManagedFromIdentity } from '@/lib/email/sendingDomains'

/**
 * How a workspace sends email. Every workspace-scoped send path resolves through here, so this is
 * where the sending-domain gate is wired in for all of them:
 *
 *  1. Bring-your-own Resend key (optional, Settings › Email provider): the workspace's own Resend
 *     account, which itself only accepts From addresses on domains verified in that account.
 *  2. Otherwise LeadsMind-managed sending: a verified domain in the platform Resend account. The
 *     returned `apiKey` is a signed, workspace-bound sender token, never the platform key.
 *     sendEmail re-checks the From domain (verified, not paused) and the rate limit on every send.
 *  3. Neither: null, and callers fail closed.
 */
export async function getWorkspaceEmailConfig(workspaceId: string) {
  if (!workspaceId) return null;

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('workspace_email_providers')
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (!error && data) {
    try {
      const apiKey = decrypt(data.encrypted_api_key)
      return {
        apiKey,
        fromEmail: data.from_email,
        fromName: data.from_name || null,
        mode: 'byo' as const,
      }
    } catch (err) {
      console.error('Failed to decrypt workspace email provider API key:', err)
      return null
    }
  }

  const managed = await resolveManagedFromIdentity(workspaceId)
  if (!managed) return null
  return {
    apiKey: signManagedSenderToken(workspaceId),
    fromEmail: managed.fromEmail,
    fromName: managed.fromName,
    mode: 'managed' as const,
  }
}
