import { createAdminClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'

export async function getWorkspaceEmailConfig(workspaceId: string) {
  if (!workspaceId) return null;

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('workspace_email_providers')
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (error || !data) return null

  try {
    const apiKey = decrypt(data.encrypted_api_key)
    return {
      apiKey,
      fromEmail: data.from_email,
      fromName: data.from_name || null
    }
  } catch (err) {
    console.error('Failed to decrypt workspace email provider API key:', err)
    return null
  }
}
