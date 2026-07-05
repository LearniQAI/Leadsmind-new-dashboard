import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }

    const status = req.nextUrl.searchParams.get('status');

    let query = supabase
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

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conversations: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    const workspaceId = req.nextUrl.searchParams.get('workspaceId');
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }

    const body = await req.json();
    const {
      status,
      assigned_agent_id,
      mode,
      visitor_name,
      visitor_email,
      visitor_phone,
      lead_captured,
      agent_typing_until
    } = body;

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

    const { data, error } = await supabase
      .from('lena_conversations')
      .update(updates)
      .eq("id", id).eq("workspace_id", workspaceId)
      .select(`
        *,
        assigned_agent:lena_agents(id, display_name, avatar_url, role_label)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conversation: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
