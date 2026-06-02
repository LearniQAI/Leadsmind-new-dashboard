import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentWorkspaceId, getUser } from '@/lib/auth'
import { sendEmail } from '@/lib/email'
import { sendSMS } from '@/lib/sms'
import { MetaAdapter } from '@/lib/meta/MetaAdapter'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const replaceTokens = (text: string, name: string, url: string) => {
  if (!text) return ''
  return text
    .replace(/\{\{\s*name\s*\}\}/gi, name)
    .replace(/\{\{\s*review_url\s*\}\}/gi, url)
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { workspaceId, campaignId, contacts, channel } = body

    if (!workspaceId || !campaignId || !contacts || !channel) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch the campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('reputation_campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('workspace_id', workspaceId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    let sent = 0
    let failed = 0

    // Fetch Twilio config for SMS/WhatsApp
    const { data: wsCreds } = await supabase
      .from('automations')
      .select('settings')
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    const twilioConfig = {
      accountSid: wsCreds?.settings?.twilio_sid || null,
      authToken: wsCreds?.settings?.twilio_token || null,
      fromNumber: wsCreds?.settings?.twilio_number || process.env.TWILIO_PHONE_NUMBER
    }

    for (const contact of contacts) {
      const contactName = contact.name || 'Customer'
      const contactEmail = contact.email || ''
      const contactPhone = contact.phone || ''

      try {
        if (channel === 'email') {
          if (!contactEmail) {
            failed++
            continue
          }

          const emailSubject = replaceTokens(campaign.email_subject, contactName, campaign.review_url)
          const emailBody = replaceTokens(campaign.email_body, contactName, campaign.review_url)

          await sendEmail({
            to: contactEmail,
            subject: emailSubject,
            html: emailBody
          })
        } else if (channel === 'whatsapp') {
          if (!contactPhone) {
            failed++
            continue
          }

          const replacedBody = replaceTokens(campaign.whatsapp_body || campaign.email_body, contactName, campaign.review_url)
          
          // Fetch Meta credentials
          const { data: conn } = await supabase
            .from('platform_connections')
            .select('credentials')
            .eq('workspace_id', workspaceId)
            .eq('platform', 'whatsapp')
            .maybeSingle()

          if (conn?.credentials) {
            const creds = conn.credentials as any
            const adapter = new MetaAdapter(creds)
            const waRes = await adapter.sendWhatsApp(
              contactPhone,
              replacedBody
            )
            if (!waRes.success) {
              throw new Error(waRes.error || 'WhatsApp sending failed')
            }
          } else {
            // Mock dispatch fallback
            const adapter = new MetaAdapter({ phone_number_id: 'mock_number_id', access_token_encrypted: '' })
            await adapter.sendWhatsApp(
              contactPhone,
              replacedBody
            )
          }
        } else if (channel === 'sms') {
          if (!contactPhone) {
            failed++
            continue
          }

          const replacedBody = replaceTokens(campaign.sms_body || campaign.email_body, contactName, campaign.review_url)

          await sendSMS({
            to: contactPhone,
            message: replacedBody,
            config: twilioConfig
          })
        } else {
          failed++
          continue
        }

        // Insert into reputation_requests
        const { error: insertError } = await supabase
          .from('reputation_requests')
          .insert({
            workspace_id: workspaceId,
            campaign_id: campaignId,
            contact_email: contactEmail,
            contact_name: contactName,
            contact_phone: contactPhone,
            channel: channel,
            status: 'sent',
            sent_at: new Date().toISOString()
          })

        if (insertError) throw insertError
        sent++
      } catch (err: any) {
        console.error(`[Reputation Send Request] Failed for contact ${contactName}:`, err.message)
        failed++
      }
    }

    return NextResponse.json({ sent, failed })
  } catch (error: any) {
    console.error('[API send-request] Server error:', error.message)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
