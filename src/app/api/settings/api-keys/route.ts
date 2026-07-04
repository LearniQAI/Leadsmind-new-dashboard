import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes, createHash } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — fetch api keys (never return the full key, only prefix)
export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  }
  const { data, error } = await supabase
    .from('workspace_api_keys')
    .select('id, key_prefix, label, created_at, last_used_at, revoked')
    .eq('workspace_id', workspaceId)
    .eq('revoked', false)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ keys: data ?? [] })
}

// POST — generate a new API key
export async function POST(req: NextRequest) {
  const { workspaceId, label } = await req.json()
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  }
  // Generate key: lm_live_[32 random hex chars]
  const rawKey = `lm_live_${randomBytes(16).toString('hex')}`
  const keyHash = createHash('sha256').update(rawKey).digest('hex')
  const keyPrefix = rawKey.substring(0, 16)

  const { error } = await supabase
    .from('workspace_api_keys')
    .insert({
      workspace_id: workspaceId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      label: label ?? 'Default',
    })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return the full key ONCE — it is never stored in plain text again
  return NextResponse.json({ key: rawKey, prefix: keyPrefix })
}

// DELETE — revoke a key
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  const { error } = await supabase
    .from('workspace_api_keys')
    .update({ revoked: true })
    .eq("id", id).eq("workspace_id", workspaceId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
