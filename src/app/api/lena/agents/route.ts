import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Same "internal team member" role set used elsewhere (e.g. LMS instructor routes) —
// 'admin'/'member' as opposed to 'client'/'viewer'/'hr'/'payroll'/'compliance'.
const LENA_TEAM_ROLES = ['admin', 'member'];

// Internal dashboard management of support agents — never called by the public chat widget
// (see LenaVisitorChat.tsx / lena/embed), so full team-member auth applies to every verb.
export async function GET(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole(LENA_TEAM_ROLES);
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from('lena_agents')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ agents: data ?? [] });
  } catch (err: any) {
    logger.error({ err }, 'lena.agents.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole(LENA_TEAM_ROLES);
    const adminClient = createAdminClient();

    const body = await req.json();
    const { user_id, display_name, role_label, avatar_url, availability, routing_topics, working_hours, avg_response_minutes } = body;

    if (!display_name) {
      return NextResponse.json({ error: 'display_name is required' }, { status: 400 });
    }

    const { data, error } = await adminClient
      .from('lena_agents')
      .insert({
        workspace_id: workspaceId,
        user_id,
        display_name,
        role_label,
        avatar_url,
        availability,
        routing_topics,
        working_hours,
        avg_response_minutes
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ agent: data });
  } catch (err: any) {
    logger.error({ err }, 'lena.agents.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { workspaceId } = await requireWorkspaceRole(LENA_TEAM_ROLES);
    const adminClient = createAdminClient();

    const body = await req.json();
    const { data, error } = await adminClient
      .from('lena_agents')
      .update(body)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ agent: data });
  } catch (err: any) {
    logger.error({ err }, 'lena.agents.patch.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { workspaceId } = await requireWorkspaceRole(LENA_TEAM_ROLES);
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from('lena_agents')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'lena.agents.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
