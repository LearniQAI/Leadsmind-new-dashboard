'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { detectCourier } from '@/lib/courier/detect'
import { createTracking } from '@/lib/courier/aftership'
import { normaliseStatus } from '@/lib/courier/normalise'
import { sendShipmentRegistered } from '@/lib/courier/emails'

export async function createShipment(
  workspaceId: string,
  payload: {
    tracking_number: string
    recipient_name?: string
    recipient_email?: string
    courier_slug?: string
  }
) {
  const supabase = createAdminClient()
  const trackingNumber = payload.tracking_number.trim()
  if (!trackingNumber) return { success: false, error: 'Tracking number is required' }

  const slug = payload.courier_slug || detectCourier(trackingNumber) || undefined

  let aftership: any = null
  try {
    aftership = await createTracking(trackingNumber, slug && slug.includes('-') ? undefined : slug)
  } catch (e: any) {
    // Keep standard fallback
  }

  const rawStatus = aftership?.tag || null
  const normal = normaliseStatus(rawStatus)

  const { data: shipment, error } = await supabase
    .from('courier_shipments')
    .insert({
      workspace_id: workspaceId,
      tracking_number: trackingNumber,
      courier_slug: aftership?.slug || (slug && !slug.includes('-') ? slug : null),
      recipient_email: payload.recipient_email || null,
      recipient_name: payload.recipient_name || null,
      source: 'manual',
      status: normal,
      raw_status: rawStatus,
      estimated_delivery: aftership?.expected_delivery || null,
    })
    .select('*')
    .single()

  if (error) return { success: false, error: error.message }

  await supabase.from('shipment_events').insert({
    shipment_id: shipment.id,
    workspace_id: workspaceId,
    normalised_status: normal,
    raw_status: rawStatus,
    occurred_at: new Date().toISOString(),
  })
  await supabase.from('tracking_poll_queue').insert({ shipment_id: shipment.id })

  try {
    await sendShipmentRegistered(shipment)
  } catch (e) {
    console.error('[Action register email error]:', e)
  }

  return { success: true, data: shipment }
}

export async function getShipmentEvents(shipmentId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('shipment_events')
    .select('*')
    .eq('shipment_id', shipmentId)
    .order('occurred_at', { ascending: false })

  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function updateTrackingBrand(workspaceId: string, brandSettings: any) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('courier_brand_settings')
    .upsert({
      workspace_id: workspaceId,
      logo_url: brandSettings.logo_url,
      brand_colour: brandSettings.brand_colour,
      tagline: brandSettings.tagline,
      from_name: brandSettings.from_name,
      from_email: brandSettings.from_email,
      custom_track_domain: brandSettings.custom_track_domain,
      white_label: brandSettings.white_label,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'workspace_id'
    })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function uploadBrandLogo(formData: FormData) {
  const supabase = createAdminClient()
  const file = formData.get('file') as File | null
  const workspaceId = formData.get('workspaceId') as string | null

  if (!file || !workspaceId) {
    return { success: false, error: 'File and workspaceId are required' }
  }

  const timestamp = Date.now()
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const filePath = `logos/${workspaceId}/${timestamp}_${safeName}`

  try {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, buffer, {
        contentType: file.type,
        duplex: 'half'
      })

    if (uploadError) {
      return { success: false, error: uploadError.message }
    }

    const { data: publicData } = supabase.storage
      .from('media')
      .getPublicUrl(filePath)

    if (!publicData?.publicUrl) {
      return { success: false, error: 'Failed to retrieve public URL' }
    }

    return { success: true, publicUrl: publicData.publicUrl }
  } catch (err: any) {
    return { success: false, error: err.message || 'Error uploading file' }
  }
}
