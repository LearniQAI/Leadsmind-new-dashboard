import { randomBytes, createHash } from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';

export interface MintedApiKey {
  key: string;
  prefix: string;
}

// Single, shared key-minting routine for workspace_api_keys — used by both
// /api/settings/api-keys (route) and generateWorkspaceApiKey (server action), so there is
// exactly one implementation of "how a LeadsMind API key gets generated and stored," not two
// diverging ones. Only the SHA-256 hash and a display prefix are ever persisted — the raw
// key is returned once, to the caller, and never stored.
export async function mintWorkspaceApiKey(workspaceId: string, label?: string): Promise<MintedApiKey> {
  const rawKey = `lm_live_${randomBytes(16).toString('hex')}`;
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.substring(0, 16);

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('workspace_api_keys')
    .insert({
      workspace_id: workspaceId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      label: label ?? 'Default',
    });

  if (error) throw error;

  return { key: rawKey, prefix: keyPrefix };
}
