import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey, apiError, apiData, parsePagination } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req, 'products')
  if (!auth.ok) return apiError(auth.error, auth.status)

  const { limit, offset } = parsePagination(req)
  const sp = req.nextUrl.searchParams
  const type = sp.get('type')
  const sku = sp.get('sku')

  const supabase = createAdminClient()
  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('workspace_id', auth.workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (type) query = query.eq('type', type)
  if (sku) query = query.eq('sku', sku)

  const { data, error, count } = await query
  if (error) return apiError('Internal server error', 500)

  return apiData(data ?? [], 200, { pagination: { limit, offset, total: count ?? 0 } })
}

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req, 'products')
  if (!auth.ok) return apiError(auth.error, auth.status)

  let body: any
  try { body = await req.json() } catch { return apiError('Invalid JSON body') }

  if (!body.name) return apiError('name is required')

  const supabase = createAdminClient()
  const payload = {
    workspace_id: auth.workspaceId,
    name: body.name,
    type: body.type ?? null,
    price: body.price ?? 0.00,
    sku: body.sku ?? null,
    quantity_on_hand: body.quantity_on_hand ?? 0,
    min_stock_level: body.min_stock_level ?? 0,
    cost_price: body.cost_price ?? null,
    costing_method: body.costing_method ?? 'FIFO',
    tracking_enabled: body.tracking_enabled ?? false,
  }

  const { data, error } = await supabase.from('products').insert(payload).select('*').single()
  if (error) return apiError('Internal server error', 500)

  return apiData(data, 201)
}
