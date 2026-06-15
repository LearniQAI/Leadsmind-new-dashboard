import { sendEmail } from '@/lib/email'
import { createAdminClient } from '@/lib/supabase/server'
import { NormalStatus } from './normalise'

export async function sendShipmentRegistered(shipment: any) {
  const supabase = createAdminClient()
  const { data: brand } = await supabase
    .from('courier_brand_settings')
    .select('*')
    .eq('workspace_id', shipment.workspace_id)
    .maybeSingle()

  const useWhiteLabel = brand?.white_label && brand.from_email
  const fromEmail = useWhiteLabel ? brand.from_email : 'shipping@leadsmind.io'
  const fromName = useWhiteLabel ? brand.from_name || 'Shipping' : 'LeadsMind Shipping'
  const trackDomain = useWhiteLabel && brand.custom_track_domain ? brand.custom_track_domain : 'track.leadsmind.io'
  
  const recipientEmail = shipment.recipient_email
  if (recipientEmail) {
    const subject = `Your shipment ${shipment.tracking_number} has been registered`
    const html = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
        ${brand?.logo_url ? `<img src="${brand.logo_url}" alt="Logo" style="max-height: 50px; margin-bottom: 20px;" />` : ''}
        <h2 style="color: ${brand?.brand_colour || '#0b1310'};">Shipment Registered</h2>
        <p>Hi ${shipment.recipient_name || 'there'},</p>
        <p>Your shipment with tracking number <strong>${shipment.tracking_number}</strong> has been registered and is currently pending carrier pickup.</p>
        <div style="margin: 20px 0;">
          <a href="https://${trackDomain}/${shipment.tracking_number}" style="background-color: ${brand?.brand_colour || '#0b1310'}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Track Shipment</a>
        </div>
        ${brand?.tagline ? `<p style="font-style: italic; color: #666; font-size: 0.9em;">${brand.tagline}</p>` : ''}
      </div>
    `
    await sendEmail({
      to: recipientEmail,
      subject,
      html,
      config: { fromEmail, fromName }
    })

    await supabase.from('notifications_sent').insert({
      shipment_id: shipment.id,
      workspace_id: shipment.workspace_id,
      audience: 'recipient',
      normalised_status: 'PENDING',
      email: recipientEmail
    })
  }

  // Admin operational alert
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
    const adminSubject = `[New Shipment] ${shipment.tracking_number} registered`
    const adminHtml = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h3>New Shipment Created</h3>
        <p>A new shipment has been registered in your workspace.</p>
        <ul>
          <li><strong>Tracking Number:</strong> ${shipment.tracking_number}</li>
          <li><strong>Recipient:</strong> ${shipment.recipient_name || 'N/A'} (${shipment.recipient_email || 'N/A'})</li>
          <li><strong>Source:</strong> ${shipment.source}</li>
        </ul>
      </div>
    `
    await sendEmail({
      to: Array.from(adminEmails),
      subject: adminSubject,
      html: adminHtml
    })

    for (const email of adminEmails) {
      await supabase.from('notifications_sent').insert({
        shipment_id: shipment.id,
        workspace_id: shipment.workspace_id,
        audience: 'admin',
        normalised_status: 'PENDING',
        email
      })
    }
  }
}

export async function sendStatusUpdate(
  shipment: any,
  status: NormalStatus,
  opts: { location?: string | null; urgent: boolean }
) {
  const supabase = createAdminClient()
  const { data: brand } = await supabase
    .from('courier_brand_settings')
    .select('*')
    .eq('workspace_id', shipment.workspace_id)
    .maybeSingle()

  const useWhiteLabel = brand?.white_label && brand.from_email
  const fromEmail = useWhiteLabel ? brand.from_email : 'shipping@leadsmind.io'
  const fromName = useWhiteLabel ? brand.from_name || 'Shipping' : 'LeadsMind Shipping'
  const trackDomain = useWhiteLabel && brand.custom_track_domain ? brand.custom_track_domain : 'track.leadsmind.io'

  const recipientEmail = shipment.recipient_email
  if (recipientEmail) {
    const subject = `Update on shipment ${shipment.tracking_number}: ${status}`
    const html = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
        ${brand?.logo_url ? `<img src="${brand.logo_url}" alt="Logo" style="max-height: 50px; margin-bottom: 20px;" />` : ''}
        <h2 style="color: ${brand?.brand_colour || '#0b1310'};">Shipment Status Update</h2>
        <p>Hi ${shipment.recipient_name || 'there'},</p>
        <p>Your shipment with tracking number <strong>${shipment.tracking_number}</strong> is now <strong>${status}</strong>.</p>
        ${opts.location ? `<p><strong>Last Location:</strong> ${opts.location}</p>` : ''}
        <div style="margin: 20px 0;">
          <a href="https://${trackDomain}/${shipment.tracking_number}" style="background-color: ${brand?.brand_colour || '#0b1310'}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Track Shipment</a>
        </div>
        ${brand?.tagline ? `<p style="font-style: italic; color: #666; font-size: 0.9em;">${brand.tagline}</p>` : ''}
      </div>
    `

    await sendEmail({
      to: recipientEmail,
      subject,
      html,
      config: { fromEmail, fromName }
    })

    await supabase.from('notifications_sent').insert({
      shipment_id: shipment.id,
      workspace_id: shipment.workspace_id,
      audience: 'recipient',
      normalised_status: status,
      email: recipientEmail
    })
  }

  // Admin operational alert for urgent statuses
  if (opts.urgent) {
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
      const adminSubject = `[Urgent shipment update] ${shipment.tracking_number} is now ${status}`
      const adminHtml = `
        <div style="font-family: sans-serif; padding: 20px;">
          <h3>Urgent Status Alert</h3>
          <p>Shipment tracking number <strong>${shipment.tracking_number}</strong> has transitioned to an urgent status: <strong>${status}</strong>.</p>
          ${opts.location ? `<p><strong>Location:</strong> ${opts.location}</p>` : ''}
        </div>
      `
      await sendEmail({
        to: Array.from(adminEmails),
        subject: adminSubject,
        html: adminHtml
      })

      for (const email of adminEmails) {
        await supabase.from('notifications_sent').insert({
          shipment_id: shipment.id,
          workspace_id: shipment.workspace_id,
          audience: 'admin',
          normalised_status: status,
          email
        })
      }
    }
  }
}
