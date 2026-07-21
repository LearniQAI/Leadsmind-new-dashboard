import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'
import { getUser, getCurrentWorkspaceId } from '@/lib/auth'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'
import { UnauthorizedError, ForbiddenError, toClientError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'

export const dynamic = 'force-dynamic';

// Resolves the authenticated user's active workspace from their session cookie and
// confirms real membership — a client-supplied workspaceId in the body/query is never trusted.
async function resolveActiveWorkspace(userId: string): Promise<string> {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    throw new ForbiddenError('No active workspace selected');
  }

  const supabaseUser = await createServerClient();
  const { data: membership } = await supabaseUser
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) {
    throw new ForbiddenError('You are not a member of the active workspace');
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

    // Generate key: lm_live_[32 random hex chars] — CSPRNG (crypto.randomBytes)
    const rawKey = `lm_live_${randomBytes(16).toString('hex')}`
    const keyHash = createHash('sha256').update(rawKey).digest('hex')
    const keyPrefix = rawKey.substring(0, 16)

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('workspace_api_keys')
      .insert({
        workspace_id: workspaceId,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        label: label ?? 'Default',
      })

    if (error) throw error;

    // Return the full key ONCE — only the hash is ever persisted
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
    const { error } = await adminClient
      .from('workspace_api_keys')
      .update({ revoked: true })
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) throw error;
    return NextResponse.json({ success: true })
  } catch (err: any) {
    logger.error({ err }, 'settings.api_keys.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
