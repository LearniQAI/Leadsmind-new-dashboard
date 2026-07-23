import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

const LENA_TEAM_ROLES = ['admin', 'member'];

// Internal dashboard list/detail of visitor conversations (includes visitor PII: name,
// email, phone) — never called by the public chat widget, so full team-member auth
// applies to every verb.
export async function GET(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole(LENA_TEAM_ROLES);
    const adminClient = createAdminClient();

    const status = req.nextUrl.searchParams.get('status');

    let query = adminClient
      .from('lena_conversations')
      .select(`
        *,
        assigned_agent:lena_agents(id, display_name, avatar_url, role_label)
      `)
      .eq('workspace_id', workspaceId);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ conversations: data ?? [] });
  } catch (err: any) {
    logger.error({ err }, 'lena.conversations.get.failed');
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
    const { status, assigned_agent_id, mode, visitor_name, visitor_email, visitor_phone, lead_captured, agent_typing_until } = body;

    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (assigned_agent_id !== undefined) updates.assigned_agent_id = assigned_agent_id;
    if (mode !== undefined) updates.mode = mode;
    if (visitor_name !== undefined) updates.visitor_name = visitor_name;
    if (visitor_email !== undefined) updates.visitor_email = visitor_email;
    if (visitor_phone !== undefined) updates.visitor_phone = visitor_phone;
    if (lead_captured !== undefined) updates.lead_captured = lead_captured;
    if (agent_typing_until !== undefined) updates.agent_typing_until = agent_typing_until;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await adminClient
      .from('lena_conversations')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select(`
        *,
        assigned_agent:lena_agents(id, display_name, avatar_url, role_label)
      `)
      .single();

    if (error) throw error;
    return NextResponse.json({ conversation: data });
  } catch (err: any) {
    logger.error({ err }, 'lena.conversations.patch.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
