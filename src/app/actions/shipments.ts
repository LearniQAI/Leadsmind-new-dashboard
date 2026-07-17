'use server'

import { createAdminClient, createServerClient } from '@/lib/supabase/server'
import { detectCourier } from '@/lib/courier/detect'
import { createTracking } from '@/lib/courier/aftership'
import { normaliseStatus, NormalStatus } from '@/lib/courier/normalise'
import { sendShipmentRegistered } from '@/lib/courier/emails'
import { logger } from '@/shared/logger'

// Confirms the caller is an authenticated member of the given workspace.
// Used by the dashboard-facing shipment actions below (createAdminClient bypasses
// RLS, so these need an explicit membership check before touching another
// workspace's data).
async function requireWorkspaceMember(workspaceId: string): Promise<boolean> {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return false

  const { data: member } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  return !!member
}

export async function createShipment(
  workspaceId: string,
  payload: {
    tracking_number: string
    recipient_name?: string
    recipient_email?: string
    courier_slug?: string
  }
) {
  // Previously had zero auth/membership check — any caller (no login
  // required) could burn another workspace's tracking quota by supplying an
  // arbitrary workspaceId, since this uses the admin client (bypasses RLS).
  // Reuses this file's existing requireWorkspaceMember() helper (already
  // used by getShipmentById/syncShipmentTracking/etc. below) rather than the
  // shared requireWorkspaceAccess() from src/lib/auth.ts, because that helper
  // only validates the *cookie-derived* active workspace — createShipment
  // takes workspaceId as an explicit argument (including from the internal
  // finance.ts:481 call site, which passes an already-verified invoice's
  // workspace_id, not necessarily the caller's active cookie workspace), so
  // what needs verifying here is specifically "is the caller a member of
  // *this* workspaceId argument", which is what requireWorkspaceMember does.
  if (!(await requireWorkspaceMember(workspaceId))) {
    return { success: false, error: 'Not authorized for this workspace' }
  }

  const supabase = createAdminClient()
  const trackingNumber = payload.tracking_number.trim()
  if (!trackingNumber) return { success: false, error: 'Tracking number is required' }

  // 1. Plan Quota Check
  let plan = 'free'
  try {
    const { data: ws } = await supabase
      .from('workspaces')
      .select('plan_tier')
      .eq('id', workspaceId)
      .single()
    if (ws) plan = ws.plan_tier || 'free'
  } catch (e) {}

  let quota: any = null
  let bypassQuota = false
  try {
    const { data } = await supabase
      .from('tracking_quota')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle()
    quota = data

    if (!quota) {
      const { data: newQuota } = await supabase
        .from('tracking_quota')
        .insert({
          workspace_id: workspaceId,
          used_count: 0,
          period_start: new Date().toISOString().split('T')[0],
          plan_tier: plan
        })
        .select('*')
        .single()
      quota = newQuota
    }

    if (quota) {
      let limit = 3
      if (plan === 'growth') {
        limit = 25
      } else if (plan === 'scale' || plan === 'custom' || plan === 'enterprise' || plan === 'unlimited') {
        limit = Infinity
      }

      if (quota.used_count >= limit) {
        if ((plan === 'free' || plan === 'spark') && !quota.test_used) {
          bypassQuota = true
        } else {
          return { success: false, error: 'Monthly quota exceeded' }
        }
      }
    }
  } catch (e) {}

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

  if (error) {
    logger.error({ err: error, workspaceId }, 'shipments.create.failed')
    return { success: false, error: 'Failed to create shipment.' }
  }

  // Increment tracking quota
  if (quota) {
    try {
      await supabase
        .from('tracking_quota')
        .update({
          used_count: quota.used_count + 1,
          test_used: bypassQuota ? true : quota.test_used,
          updated_at: new Date().toISOString()
        })
        .eq('workspace_id', workspaceId)
    } catch (e) {}
  }

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
    logger.error({ err: e, workspaceId, shipmentId: shipment.id }, 'shipments.register_email.failed')
  }

  return { success: true, data: shipment }
}

export async function getShipmentEvents(shipmentId: string) {
  const supabase = createAdminClient()

  const { data: shipment } = await supabase
    .from('courier_shipments')
    .select('workspace_id')
    .eq('id', shipmentId)
    .maybeSingle()

  if (!shipment || !(await requireWorkspaceMember(shipment.workspace_id))) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data, error } = await supabase
    .from('shipment_events')
    .select('*')
    .eq('shipment_id', shipmentId)
    .order('occurred_at', { ascending: false })

  if (error) {
    logger.error({ err: error, shipmentId }, 'shipments.events.fetch.failed')
    return { success: false, error: 'Failed to fetch shipment events.' }
  }
  return { success: true, data }
}

export async function updateTrackingBrand(workspaceId: string, brandSettings: any) {
  if (!(await requireWorkspaceMember(workspaceId))) {
    return { success: false, error: 'Unauthorized' }
  }

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
      recipient_alerts_disabled: brandSettings.recipient_alerts_disabled || false,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'workspace_id'
    })

  if (error) {
    logger.error({ err: error, workspaceId }, 'shipments.brand_settings.update.failed')
    return { success: false, error: 'Failed to update tracking brand.' }
  }
  return { success: true }
}

export async function uploadBrandLogo(formData: FormData) {
  const supabase = createAdminClient()
  const file = formData.get('file') as File | null
  const workspaceId = formData.get('workspaceId') as string | null

  if (!file || !workspaceId) {
    return { success: false, error: 'File and workspaceId are required' }
  }

  if (!(await requireWorkspaceMember(workspaceId))) {
    return { success: false, error: 'Unauthorized' }
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
      logger.error({ err: uploadError, workspaceId }, 'shipments.brand_logo.upload.failed')
      return { success: false, error: 'Failed to upload logo.' }
    }

    const { data: publicData } = supabase.storage
      .from('media')
      .getPublicUrl(filePath)

    if (!publicData?.publicUrl) {
      return { success: false, error: 'Failed to retrieve public URL' }
    }

    return { success: true, publicUrl: publicData.publicUrl }
  } catch (err: any) {
    logger.error({ err, workspaceId }, 'shipments.brand_logo.upload_action.failed')
    return { success: false, error: 'Error uploading file' }
  }
}

import { sendEmail } from '@/lib/email'
import { generateShipmentToken } from '@/lib/courier/shipmentToken'

export async function confirmReceiptAction(shipmentId: string, token: string) {
  const expectedToken = generateShipmentToken(shipmentId)

  if (token !== expectedToken) {
    return { success: false, error: 'Invalid verification token' }
  }

  const supabase = createAdminClient()
  
  const { data: shipment, error: fetchErr } = await supabase
    .from('courier_shipments')
    .select('*')
    .eq("id", shipmentId)
    .maybeSingle()

  if (fetchErr || !shipment) {
    return { success: false, error: 'Shipment not found' }
  }

  if (shipment.received_confirmed_at) {
    return { success: true } // already confirmed, idempotency
  }

  const now = new Date().toISOString()
  
  const { error: updateErr } = await supabase
    .from('courier_shipments')
    .update({
      received_confirmed_at: now,
      status: 'DELIVERED',
      raw_status: 'Confirmed by recipient'
    })
    .eq('id', shipmentId)

  if (updateErr) {
    logger.error({ err: updateErr, shipmentId }, 'shipments.receipt_confirmation.update.failed')
    return { success: false, error: 'Failed to confirm receipt.' }
  }

  await supabase.from('shipment_events').insert({
    shipment_id: shipmentId,
    workspace_id: shipment.workspace_id,
    normalised_status: 'DELIVERED',
    raw_status: 'Confirmed by recipient',
    occurred_at: now
  })

  try {
    const { data: members } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', shipment.workspace_id)

    const userIds = (members || []).map(m => m.user_id)
    const adminEmails = new Set<string>()

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('email')
        .in('id', userIds)
      if (users) {
        for (const u of users) {
          if (u.email) adminEmails.add(u.email)
        }
      }
    }

    if (adminEmails.size > 0) {
      const adminSubject = `[Delivery Confirmed] Shipment ${shipment.tracking_number} received`
      const adminHtml = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h3>Delivery Confirmed by Recipient</h3>
          <p>The recipient has confirmed receipt of shipment <strong>${shipment.tracking_number}</strong>.</p>
          <ul>
            <li><strong>Recipient Name:</strong> ${shipment.recipient_name || 'N/A'}</li>
            <li><strong>Recipient Email:</strong> ${shipment.recipient_email || 'N/A'}</li>
            <li><strong>Confirmed At:</strong> ${new Date(now).toLocaleString()}</li>
          </ul>
        </div>
      `
      await sendEmail({
        to: Array.from(adminEmails),
        subject: adminSubject,
        html: adminHtml
      })
    }
  } catch (e) {
    logger.error({ err: e, shipmentId }, 'shipments.receipt_confirmation.notification.failed')
  }

  return { success: true }
}

export async function updateShipmentStatus(
  shipmentId: string,
  payload: {
    status: NormalStatus
    active: boolean
    raw_status?: string
    location?: string
  }
) {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const { data: shipment, error: fetchErr } = await supabase
    .from('courier_shipments')
    .select('*')
    .eq("id", shipmentId)
    .maybeSingle()

  if (fetchErr || !shipment) {
    return { success: false, error: 'Shipment not found' }
  }

  if (!(await requireWorkspaceMember(shipment.workspace_id))) {
    return { success: false, error: 'Unauthorized' }
  }

  const { error: updateErr } = await supabase
    .from('courier_shipments')
    .update({
      status: payload.status,
      active: payload.active,
      raw_status: payload.raw_status || 'Manually updated by admin',
      last_location: payload.location || shipment.last_location,
      updated_at: now
    })
    .eq('id', shipmentId)

  if (updateErr) {
    logger.error({ err: updateErr, shipmentId }, 'shipments.manual_status_update.update.failed')
    return { success: false, error: 'Failed to update shipment status.' }
  }

  await supabase.from('shipment_events').insert({
    shipment_id: shipmentId,
    workspace_id: shipment.workspace_id,
    normalised_status: payload.status,
    raw_status: payload.raw_status || 'Manually updated by admin',
    location: payload.location || null,
    occurred_at: now
  })

  try {
    const { data: brand } = await supabase
      .from('courier_brand_settings')
      .select('recipient_alerts_disabled')
      .eq('workspace_id', shipment.workspace_id)
      .maybeSingle()

    if (!brand?.recipient_alerts_disabled && payload.status !== shipment.status) {
      const { sendStatusUpdate } = await import('@/lib/courier/emails')
      const { isUrgent } = await import('@/lib/courier/normalise')
      await sendStatusUpdate(
        { ...shipment, status: payload.status },
        payload.status,
        { location: payload.location, urgent: isUrgent(payload.status) }
      )
    }
  } catch (e) {
    logger.error({ err: e, shipmentId }, 'shipments.manual_status_update.notification.failed')
  }

  return { success: true }
}

export async function syncShipmentTracking(shipmentId: string) {
  const supabase = createAdminClient()
  
  const { data: shipment, error: fetchErr } = await supabase
    .from('courier_shipments')
    .select('*')
    .eq('id', shipmentId)
    .maybeSingle()

  if (fetchErr || !shipment) {
    return { success: false, error: 'Shipment not found' }
  }

  if (!shipment.courier_slug) {
    return { success: false, error: 'No courier detected/assigned for this shipment yet' }
  }

  try {
    const { getTracking } = await import('@/lib/courier/aftership')
    const aftership = await getTracking(shipment.courier_slug, shipment.tracking_number)
    
    if (!aftership) {
      return { success: false, error: 'No tracking data returned from AfterShip' }
    }

    const rawStatus = aftership.tag || null
    const { normaliseStatus } = await import('@/lib/courier/normalise')
    const normal = normaliseStatus(rawStatus)
    const location = aftership.checkpoints?.[0]?.location || null
    const estDelivery = aftership.expected_delivery || null

    const now = new Date().toISOString()

    const closed = normal === 'DELIVERED' || normal === 'RETURNED'
    const { error: updateErr } = await supabase
      .from('courier_shipments')
      .update({
        status: normal,
        raw_status: rawStatus,
        last_location: location || shipment.last_location,
        estimated_delivery: estDelivery || shipment.estimated_delivery,
        active: !closed,
        last_polled_at: now,
        updated_at: now
      })
      .eq('id', shipmentId)

    if (updateErr) {
      logger.error({ err: updateErr, shipmentId }, 'shipments.poll_update.update.failed')
      return { success: false, error: 'Failed to sync shipment status.' }
    }

    await supabase.from('shipment_events').insert({
      shipment_id: shipmentId,
      workspace_id: shipment.workspace_id,
      normalised_status: normal,
      raw_status: rawStatus || 'Polled status',
      location: location,
      occurred_at: now
    })

    try {
      const { data: brand } = await supabase
        .from('courier_brand_settings')
        .select('recipient_alerts_disabled')
        .eq('workspace_id', shipment.workspace_id)
        .maybeSingle()

      if (!brand?.recipient_alerts_disabled && normal !== shipment.status) {
        const { sendStatusUpdate } = await import('@/lib/courier/emails')
        const { isUrgent } = await import('@/lib/courier/normalise')
        await sendStatusUpdate(
          { ...shipment, status: normal },
          normal,
          { location, urgent: isUrgent(normal) }
        )
      }
    } catch (e) {
      logger.error({ err: e, shipmentId }, 'shipments.poll_update.notification.failed')
    }

    const { data: updatedShipment } = await supabase
      .from('courier_shipments')
      .select('*')
      .eq('id', shipmentId)
      .single()

    return { success: true, data: updatedShipment }
  } catch (err: any) {
    logger.error({ err, shipmentId }, 'shipments.aftership_sync.failed')
    return { success: false, error: 'Error syncing from AfterShip' }
  }
}

