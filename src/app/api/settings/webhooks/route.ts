import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth'
import { toClientError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'

export const dynamic = 'force-dynamic';

// Workspace webhooks mint new secrets and control outbound delivery targets — restricted
// to admins/owners, same as API keys and integrations.
const ALLOWED_WEBHOOK_ROLES = ['admin', 'owner'];

export async function GET(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole(ALLOWED_WEBHOOK_ROLES);
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('workspace_webhooks')
      .select('id, url, label, active, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) throw error;
    return NextResponse.json({ webhooks: data ?? [] })
  } catch (err: any) {
    logger.error({ err }, 'settings.webhooks.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole(ALLOWED_WEBHOOK_ROLES);
    const supabase = await createServerClient();

    const { url, label } = await req.json()
    if (!url) {
      return NextResponse.json({ error: 'url required' }, { status: 400 })
    }
    // Validate URL format
    try { new URL(url) } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    const { error } = await supabase
      .from('workspace_webhooks')
      .insert({ workspace_id: workspaceId, url, label: label ?? url })

    if (error) throw error;
    return NextResponse.json({ success: true })
  } catch (err: any) {
    logger.error({ err }, 'settings.webhooks.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { workspaceId } = await requireWorkspaceRole(ALLOWED_WEBHOOK_ROLES);
    const supabase = await createServerClient();

    const { error } = await supabase
      .from('workspace_webhooks')
      .delete()
      .eq("id", id).eq("workspace_id", workspaceId)

    if (error) throw error;
    return NextResponse.json({ success: true })
  } catch (err: any) {
    logger.error({ err }, 'settings.webhooks.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
