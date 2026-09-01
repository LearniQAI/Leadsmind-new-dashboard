import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth'
import { sendEmail } from '@/lib/email'
import { sendSMS } from '@/lib/sms'
import { resolveWorkspaceTwilioCredentials } from '@/lib/twilio/resolveWorkspaceTwilioCredentials'
import { MetaAdapter } from '@/lib/meta/MetaAdapter'
import { toClientError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'

const replaceTokens = (text: string, name: string, url: string) => {
  if (!text) return ''
  return text
    .replace(/\{\{\s*name\s*\}\}/gi, name)
    .replace(/\{\{\s*review_url\s*\}\}/gi, url)
}

// Dispatching a campaign spends the workspace's own Twilio/Resend/Meta credentials and can
// message arbitrary external contacts — same admin/owner tier as every other
// credential-spending action in this codebase (finance, webhooks, API keys, integrations).
// There is no 'marketing' role in the workspace_members schema to gate this more narrowly.
const ALLOWED_SEND_REQUEST_ROLES = ['admin', 'owner'];

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole(ALLOWED_SEND_REQUEST_ROLES);
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

    // The client-supplied contacts array is just {name, email, phone} — not proof that any of
    // these are real contacts of this workspace. Resolve which ones actually exist (matched by
    // email or phone, scoped to workspace_id) BEFORE dispatching to any of them, so this route
    // can't be used to blast the workspace's paid messaging credentials at arbitrary
    // third-party addresses that were never real contacts here.
    const candidateEmails = contacts.map((c: any) => c.email).filter(Boolean)
    const candidatePhones = contacts.map((c: any) => c.phone).filter(Boolean)

    const validEmails = new Set<string>()
    const validPhones = new Set<string>()

    if (candidateEmails.length > 0) {
      const { data: emailMatches } = await adminClient
        .from('contacts')
        .select('email')
        .eq('workspace_id', workspaceId)
        .in('email', candidateEmails)
      for (const row of emailMatches || []) if (row.email) validEmails.add(row.email)
    }

    if (candidatePhones.length > 0) {
      const { data: phoneMatches } = await adminClient
        .from('contacts')
        .select('phone')
        .eq('workspace_id', workspaceId)
        .in('phone', candidatePhones)
      for (const row of phoneMatches || []) if (row.phone) validPhones.add(row.phone)
    }

    let sent = 0
    let failed = 0

    // Fetch Twilio config for SMS/WhatsApp — credentials live on the `workspaces`
    // row (encrypted, with legacy plaintext fallback), same as every other Twilio
    // caller. The old `automations.settings` lookup hit a non-existent table, so
    // SMS/WhatsApp campaign sends silently used no workspace credentials.
    const { data: wsCreds } = await adminClient
      .from('workspaces')
      .select('twilio_sid, twilio_token, twilio_sid_encrypted, twilio_token_encrypted, twilio_number')
      .eq('id', workspaceId)
      .maybeSingle()

    const { accountSid, authToken } = resolveWorkspaceTwilioCredentials(wsCreds)
    const twilioConfig = {
      accountSid: accountSid || null,
      authToken: authToken || null,
      fromNumber: wsCreds?.twilio_number || process.env.TWILIO_PHONE_NUMBER
    }

    for (const contact of contacts) {
      const contactName = contact.name || 'Customer'
      const contactEmail = contact.email || ''
      const contactPhone = contact.phone || ''

      // Reject any entry that doesn't resolve to a real contact of this workspace on the
      // field the selected channel actually sends to — this must run before any dispatch
      // call fires for this contact.
      const isRealContact = channel === 'email'
        ? (!!contactEmail && validEmails.has(contactEmail))
        : (!!contactPhone && validPhones.has(contactPhone))

      if (!isRealContact) {
        logger.warn({ contactName, contactEmail, contactPhone, channel }, 'reputation.send-request.contact.not_found_in_workspace');
        failed++
        continue
      }

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
