import { createAdminClient } from '@/lib/supabase/server'
import { normaliseStatus, isUrgent, NormalStatus } from '@/lib/courier/normalise'

export async function processStatusEvent(opts: {
  shipmentId: string; rawStatus: string | null; location?: string | null; occurredAt?: string | null
}) {
  const supabase = createAdminClient()
  const { data: shipment } = await supabase
    .from('courier_shipments').select('*').eq('id', opts.shipmentId).maybeSingle()
  if (!shipment || !shipment.active) return

  const next: NormalStatus = normaliseStatus(opts.rawStatus)
  if (next === shipment.status) return // no change -> discard

  // 2h frequency rule for non-urgent IN_TRANSIT
  if (next === 'IN_TRANSIT') {
    const since = new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    const { count } = await supabase
      .from('notifications_sent').select('id', { count: 'exact', head: true })
      .eq('shipment_id', shipment.id).eq('normalised_status', 'IN_TRANSIT').gte('created_at', since)
    if ((count ?? 0) > 0) {
      await supabase.from('courier_shipments').update({ status: next, raw_status: opts.rawStatus, last_location: opts.location ?? shipment.last_location, updated_at: new Date().toISOString() }).eq('id', shipment.id)
      return
    }
  }

  await supabase.from('shipment_events').insert({
    shipment_id: shipment.id, workspace_id: shipment.workspace_id,
    normalised_status: next, raw_status: opts.rawStatus, location: opts.location ?? null,
    occurred_at: opts.occurredAt ?? new Date().toISOString(),
  })

  // Render + send both emails (urgent statuses go first)
  try {
    const { sendStatusUpdate } = await import('@/lib/courier/emails')
    await sendStatusUpdate(shipment, next, { location: opts.location, urgent: isUrgent(next) })
  } catch (e) { console.error('[courier-status-email]', e) }

  const closed = next === 'DELIVERED' || next === 'RETURNED'
  await supabase.from('courier_shipments').update({
    status: next, raw_status: opts.rawStatus, last_location: opts.location ?? shipment.last_location,
    active: !closed, updated_at: new Date().toISOString(),
  }).eq('id', shipment.id)
}
