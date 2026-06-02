import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — fetch all integrations for a workspace
export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  }
  const { data, error } = await supabase
    .from('workspace_integrations')
    .select('provider, category, connected, account_label, connected_at')
    .eq('workspace_id', workspaceId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ integrations: data ?? [] })
}

// POST — mark an integration as connected
export async function POST(req: NextRequest) {
  const { workspaceId, provider, category, accountLabel } = await req.json()
  if (!workspaceId || !provider || !category) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  const { error } = await supabase
    .from('workspace_integrations')
    .upsert({
      workspace_id: workspaceId,
      provider,
      category,
      connected: true,
      account_label: accountLabel ?? null,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id,provider' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE — disconnect an integration
export async function DELETE(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  const provider = req.nextUrl.searchParams.get('provider')
  if (!workspaceId || !provider) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  const { error } = await supabase
    .from('workspace_integrations')
    .update({
      connected: false,
      account_label: null,
      connected_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('provider', provider)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
