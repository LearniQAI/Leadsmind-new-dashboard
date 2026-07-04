import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  const { data, error } = await supabase
    .from('workspace_webhooks')
    .select('id, url, label, active, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ webhooks: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { workspaceId, url, label } = await req.json()
  if (!workspaceId || !url) {
    return NextResponse.json({ error: 'workspaceId and url required' }, { status: 400 })
  }
  // Validate URL format
  try { new URL(url) } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
  }
  const { error } = await supabase
    .from('workspace_webhooks')
    .insert({ workspace_id: workspaceId, url, label: label ?? url })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  const { error } = await supabase
    .from('workspace_webhooks')
    .delete()
    .eq("id", id).eq("workspace_id", workspaceId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
