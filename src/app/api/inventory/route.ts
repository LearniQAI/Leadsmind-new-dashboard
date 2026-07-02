import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const search = req.nextUrl.searchParams.get('search')
  const category = req.nextUrl.searchParams.get('category')

  let query = supabase
    .from('inventory_items')
    .select('*')
    .eq('workspace_id', workspaceId)

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  const { data, error } = await query.order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ inventoryItems: data ?? [] })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { data, error } = await supabase
      .from('inventory_items')
      .insert(body)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, inventoryItem: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  try {
    const body = await req.json()
    body.updated_at = new Date().toISOString()
    const { data, error } = await supabase
      .from('inventory_items')
      .update(body)
      .eq("id", id).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, inventoryItem: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('inventory_items').delete().eq("id", id).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
