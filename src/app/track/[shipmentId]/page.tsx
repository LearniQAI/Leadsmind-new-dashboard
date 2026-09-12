import React from 'react'
import { createAdminClient } from '@/lib/supabase/server'
import { generateShipmentToken } from '@/lib/courier/shipmentToken'
import TrackClientPage from './TrackClientPage'

interface PageProps {
  params: {
    shipmentId: string
  }
}

export default async function Page({ params }: PageProps) {
  const { shipmentId } = params
  const supabase = createAdminClient()

  // 1. Find shipment by UUID or tracking number
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shipmentId)
  let query = supabase.from('courier_shipments').select('*')
  if (isUuid) {
    query = query.eq('id', shipmentId)
  } else {
    query = query.eq('tracking_number', shipmentId)
  }
  
  const { data: shipment, error: shipmentErr } = await query.maybeSingle()

  if (shipmentErr || !shipment) {
    return (
      <div className="min-h-screen bg-dash-bg text-dash-text flex flex-col items-center justify-center p-6 font-dm-sans">
        <div className="w-full max-w-md bg-dash-surface border border-dash-border rounded-[24px] shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 border border-red-200 text-red-600 mb-6">
            <i className="fa-solid fa-circle-exclamation text-2xl"></i>
          </div>
          <h1 className="text-xl font-bold font-space-grotesk mb-2 text-dash-text">Shipment Not Found</h1>
          <p className="text-sm text-dash-textMuted leading-relaxed mb-6">
            We couldn't locate any shipment matching the tracking details provided. Please check the ID or tracking number and try again.
          </p>
        </div>
      </div>
    )
  }

  // 2. Fetch brand settings for workspace
  const { data: brand } = await supabase
    .from('courier_brand_settings')
    .select('*')
    .eq('workspace_id', shipment.workspace_id)
    .maybeSingle()

  // 3. Fetch shipment events
  const { data: events } = await supabase
    .from('shipment_events')
    .select('*')
    .eq('shipment_id', shipment.id)
    .order('occurred_at', { ascending: false })

  // 4. Generate token if confirm received is possible
  let token = ''
  if (!shipment.received_confirmed_at && (shipment.status === 'OUT_FOR_DELIVERY' || shipment.status === 'DELIVERED')) {
    token = generateShipmentToken(shipment.id)
  }

  return (
    <TrackClientPage
      shipment={shipment}
      brand={brand || {}}
      events={events || []}
      token={token}
    />
  )
}
