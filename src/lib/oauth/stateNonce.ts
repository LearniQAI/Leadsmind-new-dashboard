import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { ForbiddenError } from '@/shared/errors/AppError';

// Long enough for a real user to complete a provider's consent screen, short enough to keep
// the replay window tight if a nonce is ever intercepted before use.
const NONCE_TTL_MS = 10 * 60 * 1000;

// Called when INITIATING an OAuth connect flow (getMetaAuthUrl, getGoogleAuthUrl, etc).
// Verifies the caller is a real authenticated member of their own real (session-resolved,
// membership-checked) workspace, then mints a random opaque nonce bound server-side to that
// user + workspace (+ any platform-specific extra data, e.g. which Meta sub-platform was
// requested). The OAuth `state` param is set to ONLY this nonce — never the workspace_id
// itself — so a callback request can't claim an arbitrary workspace by supplying a
// different state value.
export async function createOAuthStateNonce(platform: string, extra: Record<string, any> = {}): Promise<{ nonce: string; workspaceId: string }> {
  const { userId, workspaceId } = await requireWorkspaceAccess();
  const nonce = crypto.randomBytes(32).toString('hex');

  const adminClient = createAdminClient();
  const { error } = await adminClient.from('oauth_state_nonces').insert({
    nonce,
    user_id: userId,
    workspace_id: workspaceId,
    platform,
    extra,
    expires_at: new Date(Date.now() + NONCE_TTL_MS).toISOString(),
  });
  if (error) throw error;

  return { nonce, workspaceId };
}

// Called on the OAuth CALLBACK, before any token exchange or workspace data write. Verifies
// the state nonce is real, unexpired, unused, and was minted for this exact platform — then
// marks it used (single-use) and returns the real workspace_id/extra data bound to it at
// initiation. Throws ForbiddenError on any mismatch — callers must reject the request before
// touching workspace data, never fall back to trusting the raw state value.
export async function consumeOAuthStateNonce(
  nonce: string | null,
  platform: string
): Promise<{ userId: string; workspaceId: string; extra: Record<string, any> }> {
  if (!nonce) throw new ForbiddenError('Missing or invalid OAuth state');

  const adminClient = createAdminClient();
  const { data: record, error } = await adminClient
    .from('oauth_state_nonces')
    .select('*')
    .eq('nonce', nonce)
    .eq('platform', platform)
    .maybeSingle();

  if (error) throw error;
  if (!record) throw new ForbiddenError('Missing or invalid OAuth state');
  if (record.used_at) throw new ForbiddenError('This OAuth authorization link has already been used');
  if (new Date(record.expires_at).getTime() < Date.now()) throw new ForbiddenError('This OAuth authorization link has expired');

  // Mark used immediately (single-use) — even if the caller's subsequent token exchange
  // fails, this nonce must never be replayable.
  await adminClient.from('oauth_state_nonces').update({ used_at: new Date().toISOString() }).eq('nonce', nonce);

  return { userId: record.user_id, workspaceId: record.workspace_id, extra: (record.extra as Record<string, any>) || {} };
}
