import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth'
import { toClientError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from('reputation_campaigns')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (err: any) {
    logger.error({ err }, 'reputation.campaigns.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    const body = await req.json()
    const { name, review_platform, review_url, email_subject, email_body, sms_body, whatsapp_body, status } = body

    if (!name || !review_platform || !review_url || !email_subject || !email_body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await adminClient
      .from('reputation_campaigns')
      .insert({
        workspace_id: workspaceId,
        name,
        review_platform,
        review_url,
        email_subject,
        email_body,
        sms_body: sms_body || '',
        whatsapp_body: whatsapp_body || '',
        status: status || 'active'
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err: any) {
    logger.error({ err }, 'reputation.campaigns.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 })

    const { workspaceId } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    const body = await req.json()
    delete body.workspace_id;

    const { data, error } = await adminClient
      .from('reputation_campaigns')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq("id", id).eq("workspace_id", workspaceId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err: any) {
    logger.error({ err }, 'reputation.campaigns.patch.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 })

    const { workspaceId } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from('reputation_campaigns')
      .delete()
      .eq("id", id).eq("workspace_id", workspaceId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    logger.error({ err }, 'reputation.campaigns.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
