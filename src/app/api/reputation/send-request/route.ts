import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth'
import { sendEmail } from '@/lib/email'
import { sendSMS } from '@/lib/sms'
import { MetaAdapter } from '@/lib/meta/MetaAdapter'
import { toClientError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'

const replaceTokens = (text: string, name: string, url: string) => {
  if (!text) return ''
  return text
    .replace(/\{\{\s*name\s*\}\}/gi, name)
    .replace(/\{\{\s*review_url\s*\}\}/gi, url)
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    const body = await req.json()
    const { campaignId, contacts, channel } = body

    if (!campaignId || !contacts || !channel) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch the campaign details, scoped to the caller's own workspace
    const { data: campaign, error: campaignError } = await adminClient
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
    const { data: wsCreds } = await adminClient
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
          const { data: conn } = await adminClient
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
        const { error: insertError } = await adminClient
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
        logger.error({ err, contactName }, 'reputation.send-request.contact.failed');
        failed++
      }
    }

    return NextResponse.json({ sent, failed })
  } catch (err: any) {
    logger.error({ err }, 'reputation.send-request.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
