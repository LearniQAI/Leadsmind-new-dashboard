import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspaceId parameter' }, { status: 400 });
    }

    const { data: rules, error } = await supabaseAdmin
      .from('lms_automation_rules')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data: rules });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      workspace_id,
      name,
      trigger_type,
      trigger_config = {},
      action_type,
      action_config = {},
      active = true
    } = body;

    if (!workspace_id || !name || !trigger_type || !action_type) {
      return NextResponse.json({ error: 'Missing required fields: workspace_id, name, trigger_type, action_type' }, { status: 400 });
    }

    const { data: rule, error } = await supabaseAdmin
      .from('lms_automation_rules')
      .insert({
        workspace_id,
        name,
        trigger_type,
        trigger_config,
        action_type,
        action_config,
        active
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data: rule });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const workspaceId = searchParams.get('workspaceId');

    if (!id) {
      return NextResponse.json({ error: 'Missing rule id parameter' }, { status: 400 });
    }
    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspaceId parameter' }, { status: 400 });
    }

    const body = await req.json();
    const {
      name,
      trigger_type,
      trigger_config,
      action_type,
      action_config,
      active
    } = body;

    const updatePayload: any = {};
    if (name !== undefined) updatePayload.name = name;
    if (trigger_type !== undefined) updatePayload.trigger_type = trigger_type;
    if (trigger_config !== undefined) updatePayload.trigger_config = trigger_config;
    if (action_type !== undefined) updatePayload.action_type = action_type;
    if (action_config !== undefined) updatePayload.action_config = action_config;
    if (active !== undefined) updatePayload.active = active;

    const { data: rule, error } = await supabaseAdmin
      .from('lms_automation_rules')
      .update(updatePayload)
      .eq("id", id).eq("workspace_id", workspaceId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data: rule });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const workspaceId = searchParams.get('workspaceId');

    if (!id) {
      return NextResponse.json({ error: 'Missing rule id parameter' }, { status: 400 });
    }
    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspaceId parameter' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('lms_automation_rules')
      .delete()
      .eq("id", id).eq("workspace_id", workspaceId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
