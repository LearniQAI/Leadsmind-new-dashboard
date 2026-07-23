import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// GET — list automation rules for the caller's own workspace
export async function GET(req: NextRequest) {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { data: rules, error } = await adminClient
      .from('lms_automation_rules')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data: rules });
  } catch (err: any) {
    logger.error({ err }, 'lms.automations.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

// POST — create an automation rule in the caller's own workspace
export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const body = await req.json();
    const {
      name,
      trigger_type,
      trigger_config = {},
      action_type,
      action_config = {},
      active = true
    } = body;

    if (!name || !trigger_type || !action_type) {
      return NextResponse.json({ error: 'Missing required fields: name, trigger_type, action_type' }, { status: 400 });
    }

    const { data: rule, error } = await adminClient
      .from('lms_automation_rules')
      .insert({
        workspace_id: workspaceId,
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
    logger.error({ err }, 'lms.automations.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

// PATCH — update a rule, scoped to the caller's own workspace
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing rule id parameter' }, { status: 400 });

    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const body = await req.json();
    const { name, trigger_type, trigger_config, action_type, action_config, active } = body;

    const updatePayload: any = {};
    if (name !== undefined) updatePayload.name = name;
    if (trigger_type !== undefined) updatePayload.trigger_type = trigger_type;
    if (trigger_config !== undefined) updatePayload.trigger_config = trigger_config;
    if (action_type !== undefined) updatePayload.action_type = action_type;
    if (action_config !== undefined) updatePayload.action_config = action_config;
    if (active !== undefined) updatePayload.active = active;

    const { data: rule, error } = await adminClient
      .from('lms_automation_rules')
      .update(updatePayload)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data: rule });
  } catch (err: any) {
    logger.error({ err }, 'lms.automations.patch.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

// DELETE — remove a rule, scoped to the caller's own workspace
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing rule id parameter' }, { status: 400 });

    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from('lms_automation_rules')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'lms.automations.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
