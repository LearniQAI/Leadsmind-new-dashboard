import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth'
import { toClientError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole();
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('webhook_delivery_logs')
      .select('id, webhook_id, event, response_status, success, error_message, delivered_at, webhook:workspace_webhooks(label, url)')
      .eq('workspace_id', workspaceId)
      .order('delivered_at', { ascending: false })
      .limit(50)

    if (error) throw error;
    return NextResponse.json({ logs: data ?? [] })
  } catch (err: any) {
    logger.error({ err }, 'settings.webhooks_logs.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
