import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

const LENA_TEAM_ROLES = ['admin', 'member'];

function corsResponse(body: any, init?: ResponseInit) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...(init?.headers || {}),
  };
  return NextResponse.json(body, { ...init, headers });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// GET is intentionally public and unauthenticated — this is the same config the embeddable
// widget script (lena/embed/[workspaceId]) reads to render bot name/color/welcome message
// on a third-party site with no login. lena_configs contains no secrets (see schema: bot
// name, welcome message, tone, colors, quick replies, trigger rules — all
// intentionally-public branding/behavior), so this doesn't expose anything sensitive.
export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) {
      return corsResponse({ error: 'workspaceId required' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('lena_configs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      const { data: newConfig, error: insertError } = await adminClient
        .from('lena_configs')
        .insert({ workspace_id: workspaceId })
        .select()
        .single();

      if (insertError) throw insertError;
      return corsResponse({ config: newConfig });
    }

    return corsResponse({ config: data });
  } catch (err: any) {
    logger.error({ err }, 'lena.config.get.failed');
    const clientError = toClientError(err);
    return corsResponse({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

// POST/PATCH edit the bot's live behavior/branding for a workspace — unlike GET, this must
// require real team auth. workspaceId is resolved from the session, never the client body,
// so a team member can only ever edit their own workspace's config.
export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole(LENA_TEAM_ROLES);
    const adminClient = createAdminClient();

    const body = await req.json();
    const { workspaceId: _ignoredClientWorkspaceId, ...updates } = body;

    const { data, error } = await adminClient
      .from('lena_configs')
      .upsert(
        { workspace_id: workspaceId, ...updates, updated_at: new Date().toISOString() },
        { onConflict: 'workspace_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return corsResponse({ config: data });
  } catch (err: any) {
    logger.error({ err }, 'lena.config.post.failed');
    const clientError = toClientError(err);
    return corsResponse({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function PATCH(req: NextRequest) {
  return POST(req);
}
