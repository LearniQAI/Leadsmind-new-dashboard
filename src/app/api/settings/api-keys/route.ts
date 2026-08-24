import { NextRequest, NextResponse } from 'next/server'
import { getUser, getCurrentWorkspaceId } from '@/lib/auth'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'
import { UnauthorizedError, ForbiddenError, NotFoundError, toClientError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'
import { mintWorkspaceApiKey } from '@/lib/api/apiKeys'

export const dynamic = 'force-dynamic';

const ALLOWED_API_KEY_ROLES = ['admin', 'owner'];

// Resolves the authenticated user's active workspace from their session cookie, confirms
// real membership, and requires an admin/owner role — a client-supplied workspaceId in the
// body/query is never trusted. Minting/revoking API keys is an admin-level action.
async function resolveActiveWorkspace(userId: string): Promise<string> {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    throw new ForbiddenError('No active workspace selected');
  }

  const supabaseUser = await createServerClient();
  const { data: membership } = await supabaseUser
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) {
    throw new ForbiddenError('You are not a member of the active workspace');
  }

  if (!ALLOWED_API_KEY_ROLES.includes(membership.role)) {
    throw new ForbiddenError('Only workspace admins or owners can manage API keys');
  }

  return workspaceId;
}

// GET — fetch api keys (never return the full key, only prefix)
export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) throw new UnauthorizedError();

    const workspaceId = await resolveActiveWorkspace(user.id);

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('workspace_api_keys')
      .select('id, key_prefix, label, created_at, last_used_at, revoked')
      .eq('workspace_id', workspaceId)
      .eq('revoked', false)
      .order('created_at', { ascending: false })

    if (error) throw error;
    return NextResponse.json({ keys: data ?? [] })
  } catch (err: any) {
    logger.error({ err }, 'settings.api_keys.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

// POST — generate a new API key
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) throw new UnauthorizedError();

    const workspaceId = await resolveActiveWorkspace(user.id);
    const { label } = await req.json()

    // Generate key: lm_live_[32 random hex chars] — CSPRNG (crypto.randomBytes). Only the
    // hash is ever persisted; the raw key is returned once, below.
    const { key: rawKey, prefix: keyPrefix } = await mintWorkspaceApiKey(workspaceId, label);

    return NextResponse.json({ key: rawKey, prefix: keyPrefix })
  } catch (err: any) {
    logger.error({ err }, 'settings.api_keys.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

// DELETE — revoke a key
export async function DELETE(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) throw new UnauthorizedError();

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const workspaceId = await resolveActiveWorkspace(user.id);

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('workspace_api_keys')
      .update({ revoked: true })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('id')

    if (error) throw error;
    if (!data || data.length === 0) throw new NotFoundError('API key');
    return NextResponse.json({ success: true })
  } catch (err: any) {
    logger.error({ err }, 'settings.api_keys.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
