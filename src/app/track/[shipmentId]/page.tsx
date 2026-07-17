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
      <div className="min-h-screen bg-[#04091a] text-white flex flex-col items-center justify-center p-6 font-dm-sans">
        <div className="w-full max-w-md bg-[#080f28] border border-white/5 rounded-[24px] shadow-2xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 mb-6">
            <i className="fa-solid fa-circle-exclamation text-2xl"></i>
          </div>
          <h1 className="text-xl font-bold font-space-grotesk mb-2 text-white">Shipment Not Found</h1>
          <p className="text-sm text-[#94a3c8] leading-relaxed mb-6">
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
