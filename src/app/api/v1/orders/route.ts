import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey, apiError, apiData, parsePagination } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req, 'orders')
  if (!auth.ok) return apiError(auth.error, auth.status)

  const { limit, offset } = parsePagination(req)
  const sp = req.nextUrl.searchParams
  const status = sp.get('status')
  const contactId = sp.get('contact_id')

  const supabase = createAdminClient()
  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('workspace_id', auth.workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (contactId) query = query.eq('contact_id', contactId)

  const { data, error, count } = await query
  if (error) return apiError('Internal server error', 500)

  return apiData(data ?? [], 200, { pagination: { limit, offset, total: count ?? 0 } })
}

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req, 'orders')
  if (!auth.ok) return apiError(auth.error, auth.status)

  let body: any
  try { body = await req.json() } catch { return apiError('Invalid JSON body') }

  const supabase = createAdminClient()
  const payload = {
    workspace_id: auth.workspaceId,
    contact_id: body.contact_id ?? null,
    status: body.status ?? 'pending',
    subtotal: body.subtotal ?? 0.00,
    discount: body.discount ?? 0.00,
    tax: body.tax ?? 0.00,
    total: body.total ?? 0.00,
    stripe_payment_intent_id: body.stripe_payment_intent_id ?? null,
    stripe_session_id: body.stripe_session_id ?? null,
    notes: body.notes ?? null,
  }

  const { data, error } = await supabase.from('orders').insert(payload).select('*').single()
  if (error) return apiError('Internal server error', 500)

  return apiData(data, 201)
}
