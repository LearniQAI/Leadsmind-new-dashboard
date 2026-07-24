import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey, apiError, apiData, parsePagination } from '@/lib/api/auth'
import { detectCourier } from '@/lib/courier/detect'
import { createTracking } from '@/lib/courier/aftership'
import { normaliseStatus } from '@/lib/courier/normalise'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req)
  if (!auth.ok) return apiError(auth.error, auth.status)
  const { limit, offset } = parsePagination(req)
  const supabase = createAdminClient()
  const { data, error, count } = await supabase
    .from('courier_shipments').select('*', { count: 'exact' })
    .eq('workspace_id', auth.workspaceId).order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) return apiError('Internal server error', 500)
  return apiData(data ?? [], 200, { pagination: { limit, offset, total: count ?? 0 } })
}

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req)
  if (!auth.ok) return apiError(auth.error, auth.status)
  let body: any
  try { body = await req.json() } catch { return apiError('Invalid JSON body') }
  const trackingNumber = (body.tracking_number || '').trim()
  if (!trackingNumber) return apiError('tracking_number is required')

  const supabase = createAdminClient()
  const slug = body.courier_slug || detectCourier(trackingNumber) || undefined

  let aftership: any = null
  try { aftership = await createTracking(trackingNumber, slug && slug.includes('-') ? undefined : slug) }
  catch (e: any) { /* AfterShip may already track it; continue with PENDING */ }

  const rawStatus = aftership?.tag || null
  const normal = normaliseStatus(rawStatus)

  const { data: shipment, error } = await supabase.from('courier_shipments').insert({
    workspace_id: auth.workspaceId,
    tracking_number: trackingNumber,
    courier_slug: aftership?.slug || (slug && !slug.includes('-') ? slug : null),
    contact_id: body.contact_id ?? null,
    recipient_email: body.recipient_email ?? null,
    recipient_name: body.recipient_name ?? null,
    source: body.source || 'api',
    source_id: body.source_id ?? null,
    status: normal, raw_status: rawStatus,
    estimated_delivery: aftership?.expected_delivery ?? null,
  }).select('*').single()
  if (error) return apiError('Internal server error', 500)

  await supabase.from('shipment_events').insert({
    shipment_id: shipment.id, workspace_id: auth.workspaceId,
    normalised_status: normal, raw_status: rawStatus, occurred_at: new Date().toISOString(),
  })
  await supabase.from('tracking_poll_queue').insert({ shipment_id: shipment.id })

  // Registration emails (recipient + admin)
  try {
    const { sendShipmentRegistered } = await import('@/lib/courier/emails')
    await sendShipmentRegistered(shipment)
  } catch (e) { console.error('[courier-register-email]', e) }

  return apiData(shipment, 201)
}
