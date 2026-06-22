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

  if (error) return { success: false, error: error.message }

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
      recipient_alerts_disabled: brandSettings.recipient_alerts_disabled || false,
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

import { createHmac } from 'crypto'
import { sendEmail } from '@/lib/email'

export async function confirmReceiptAction(shipmentId: string, token: string) {
  const secret = process.env.ENCRYPTION_KEY || 'courier-secret'
  const expectedToken = createHmac('sha256', secret).update(shipmentId).digest('hex')
  
  if (token !== expectedToken) {
    return { success: false, error: 'Invalid verification token' }
  }

  const supabase = createAdminClient()
  
  const { data: shipment, error: fetchErr } = await supabase
    .from('courier_shipments')
    .select('*')
    .eq('id', shipmentId)
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
    return { success: false, error: updateErr.message }
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
    console.error('[confirmReceiptAction notification error]:', e)
  }

  return { success: true }
}

export async function generateShipmentTokenAction(shipmentId: string) {
  const secret = process.env.ENCRYPTION_KEY || 'courier-secret'
  return createHmac('sha256', secret).update(shipmentId).digest('hex')
}

