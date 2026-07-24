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

    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')

    let query = adminClient
      .from('reputation_requests')
      .select('*')
      .eq('workspace_id', workspaceId)

    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    const { data, error } = await query.order('sent_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (err: any) {
    logger.error({ err }, 'reputation.requests.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
