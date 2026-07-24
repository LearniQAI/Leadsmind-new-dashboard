// src/app/api/v1/invoices/route.ts
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey, apiError, apiData, parsePagination } from '@/lib/api/auth'
import { dispatchWebhook } from '@/lib/webhooks/dispatcher'

export const dynamic = 'force-dynamic'

// GET /api/v1/invoices?status=&limit=&offset=
export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req)
  if (!auth.ok) return apiError(auth.error, auth.status)

  const { limit, offset } = parsePagination(req)
  const status = req.nextUrl.searchParams.get('status')

  const supabase = createAdminClient()
  let query = supabase
    .from('invoices')
    .select('*', { count: 'exact' })
    .eq('workspace_id', auth.workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)

  const { data, error, count } = await query
  if (error) return apiError('Internal server error', 500)
  return apiData(data ?? [], 200, { pagination: { limit, offset, total: count ?? 0 } })
}

// POST /api/v1/invoices
export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req)
  if (!auth.ok) return apiError(auth.error, auth.status)

  let body: any
  try { body = await req.json() } catch { return apiError('Invalid JSON body') }

  const amount = Number(body.amount ?? body.total_amount)
  if (!amount || Number.isNaN(amount)) return apiError('amount is required')

  const supabase = createAdminClient()
  const invoiceNumber =
    body.invoice_number || `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`

  const payload: Record<string, any> = {
    workspace_id: auth.workspaceId,
    contact_id: body.contact_id ?? null,
    invoice_number: invoiceNumber,
    amount,
    total_amount: Number(body.total_amount ?? amount),
    status: body.status ?? 'draft',
    due_date: body.due_date ?? null,
  }

  const { data, error } = await supabase.from('invoices').insert(payload).select('*').single()
  if (error) return apiError('Internal server error', 500)
  await dispatchWebhook(auth.workspaceId, 'invoice.created', { invoice: data })
  return apiData(data, 201)
}
