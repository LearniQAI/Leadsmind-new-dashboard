import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  }
  const { data, error } = await supabase
    .from('webhook_delivery_logs')
    .select('id, webhook_id, event, response_status, success, error_message, delivered_at, webhook:workspace_webhooks(label, url)')
    .eq('workspace_id', workspaceId)
    .order('delivered_at', { ascending: false })
    .limit(50)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ logs: data ?? [] })
}
