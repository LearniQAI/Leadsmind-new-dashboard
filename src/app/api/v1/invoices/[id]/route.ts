// src/app/api/v1/invoices/[id]/route.ts
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey, apiError, apiData } from '@/lib/api/auth'
import { dispatchWebhook } from '@/lib/webhooks/dispatcher'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await validateApiKey(req)
  if (!auth.ok) return apiError(auth.error, auth.status)

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('workspace_id', auth.workspaceId)
    .eq('id', params.id)
    .maybeSingle()

  if (error) return apiError('Internal server error', 500)
  if (!data) return apiError('Invoice not found', 404)
  return apiData(data)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await validateApiKey(req)
  if (!auth.ok) return apiError(auth.error, auth.status)

  let body: any
  try { body = await req.json() } catch { return apiError('Invalid JSON body') }

  const supabase = createAdminClient()
  const { data: current, error: curErr } = await supabase
    .from('invoices')
    .select('*')
    .eq('workspace_id', auth.workspaceId)
    .eq('id', params.id)
    .maybeSingle()

  if (curErr) return apiError(curErr.message, 500)
  if (!current) return apiError('Invoice not found', 404)

  const allowed = ['amount', 'total_amount', 'status', 'due_date', 'invoice_number', 'contact_id', 'paid_at']
  const updates: Record<string, any> = {}
  for (const k of allowed) if (k in body) updates[k] = body[k]

  // Mark-paid convenience: status -> paid stamps paid_at if not provided.
  if (updates.status === 'paid' && !updates.paid_at && current.status !== 'paid') {
    updates.paid_at = new Date().toISOString()
  }
  if (Object.keys(updates).length === 0) return apiError('No updatable fields provided')

  const { data: updated, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('workspace_id', auth.workspaceId)
    .eq('id', params.id)
    .select('*')
    .single()
  if (error) return apiError('Internal server error', 500)

  if ('status' in updates && updates.status !== current.status) {
    if (updates.status === 'paid') await dispatchWebhook(auth.workspaceId, 'invoice.paid', { invoice: updated })
    else if (updates.status === 'sent') await dispatchWebhook(auth.workspaceId, 'invoice.sent', { invoice: updated })
  }
  return apiData(updated)
}

export async function PUT(req: NextRequest, ctx: { params: { id: string } }) {
  return PATCH(req, ctx)
}
