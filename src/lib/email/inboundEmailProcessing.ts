import { createClient } from '@supabase/supabase-js';
import { logger } from '@/shared/logger';
import { parseFromHeader } from './inboundAddress';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Shared by both consumers of /api/webhooks/resend/inbound (the Email→SMS
// bridge and, as of Email Channel Part 1, the Communications Hub's email
// conversations): Resend's inbound webhook payload does NOT carry the email
// body — it must be fetched via the /emails/receiving/:id REST endpoint (the
// Node SDK has spotty support for it, confirmed live — see
// docs/EMAIL_SMS_BRIDGE.md), then falls back to whatever the webhook payload
// itself carried, then strips quoted replies/signatures the same way for both
// consumers. Kept out of the route file (not a route export) so it's a plain,
// unit-testable module.
export async function resolveInboundEmailContent(emailData: any): Promise<{ bodyText: string; rawText: string }> {
  let fetchedText = '';
  let fetchedHtml = '';
  if (emailData.email_id) {
    try {
      const resendResponse = await fetch(`https://api.resend.com/emails/receiving/${emailData.email_id}`, {
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` }
      });

      if (resendResponse.ok) {
        const emailJson = await resendResponse.json();
        fetchedText = emailJson.text || '';
        fetchedHtml = emailJson.html || '';
      } else {
        logger.error({ status: resendResponse.status }, 'webhook.resend_inbound.receiving_api.failed');
      }
    } catch (err) {
      logger.error({ err }, 'webhook.resend_inbound.email_fetch.failed');
    }
  }

  let bodyText = '';
  if (fetchedText && fetchedText.trim().length > 0) {
    bodyText = fetchedText.trim();
  } else if (fetchedHtml && fetchedHtml.trim().length > 0) {
    bodyText = fetchedHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  } else if (emailData.text) {
    bodyText = emailData.text.trim();
  } else if (emailData.html) {
    bodyText = emailData.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  if (bodyText) {
    bodyText = bodyText.split(/On\s+.*wrote:/i)[0]; // Gmail style
    bodyText = bodyText.split(/From:/i)[0]; // Outlook style
    bodyText = bodyText.split(/_{10,}/)[0]; // Underscore separators
    bodyText = bodyText.trim();
  }

  let rawText = '';
  if (emailData.subject && bodyText) {
    rawText = `Subj: ${emailData.subject}\n\n${bodyText}`;
  } else if (bodyText) {
    rawText = bodyText;
  } else if (emailData.subject) {
    rawText = `Subj: ${emailData.subject}`;
  }

  return { bodyText, rawText };
}

export async function insertWebhookDeadLetter(provider: string, payload: any, error: string, error_type: string, retry_state: string) {
  try {
    await supabaseAdmin.from('webhook_dead_letters').insert({ provider, payload, error, error_type, retry_state });
  } catch (dbErr: any) {
    logger.error({ err: dbErr, provider }, 'webhook.resend_inbound.dead_letter_insert.failed');
  }
}

/** Convenience wrapper — every dead letter in this file except the Twilio
 *  SMS-relay failure uses provider:'resend' (unchanged from the pre-refactor
 *  behavior). */
export async function deadLetterResendEvent(payload: any, error: string, error_type: string, retry_state: string) {
  return insertWebhookDeadLetter('resend', payload, error, error_type, retry_state);
}

/**
 * Email Channel Part 1 — an inbound email addressed to a workspace's real
 * receiving alias ({slug}@INBOUND_EMAIL_DOMAIN, see ./inboundAddress.ts)
 * becomes a real platform:'email' conversation/message, using the exact same
 * conversation shape sendDocumentToContact() / sendMessage()'s email branch
 * already create today (one conversation per contact — the contact-based
 * grouping decision, not subject-based; flagged to the PRD owner). Modeled
 * structurally on handleInstagramDMMessage() in webhooks/meta/route.ts:
 * resolve tenant, resolve sender identity, find-or-create the conversation,
 * insert the message.
 */
export async function handleInboundWorkspaceEmail(params: { emailData: any; from: string; messageId: string; workspaceSlug: string }) {
  const { emailData, from, messageId, workspaceSlug } = params;

  const { data: workspace } = await supabaseAdmin.from('workspaces').select('id').eq('slug', workspaceSlug).maybeSingle();
  if (!workspace) {
    logger.error({ workspaceSlug }, 'webhook.resend_inbound.email_channel.workspace_not_found');
    await deadLetterResendEvent(emailData, `No workspace found for inbound alias ${workspaceSlug}`, 'validation_failed', 'dropped');
    return;
  }
  const workspaceId = workspace.id;

  const { name: fromName, email: fromEmail } = parseFromHeader(from);
  if (!fromEmail) {
    logger.error({ from }, 'webhook.resend_inbound.email_channel.sender_unparseable');
    await deadLetterResendEvent(emailData, 'Could not parse a sender address from the From header', 'validation_failed', 'dropped');
    return;
  }

  const { rawText } = await resolveInboundEmailContent(emailData);
  if (!rawText) {
    logger.error({}, 'webhook.resend_inbound.email_channel.body_empty');
    await deadLetterResendEvent(emailData, 'Empty body after strip', 'validation_failed', 'dropped');
    return;
  }

  // Contact resolution by email — case-insensitive, same normalization
  // convention as affiliates.ts's contact-by-email lookup elsewhere in this
  // project. Creates a new contact on first contact, mirroring (in spirit,
  // simplified — an email address IS the identity, no profile-fetch step
  // needed) the Meta DM webhook's placeholder-contact-then-sync pattern.
  let contactId: string;
  const { data: existingContact } = await supabaseAdmin
    .from('contacts')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('email', fromEmail)
    .limit(1)
    .maybeSingle();

  if (existingContact) {
    contactId = existingContact.id;
  } else {
    const { data: newContact, error: contactErr } = await supabaseAdmin
      .from('contacts')
      .insert({
        workspace_id: workspaceId,
        first_name: fromName || 'Email User',
        last_name: '',
        email: fromEmail,
        source: 'email',
      })
      .select('id')
      .single();

    if (contactErr || !newContact) {
      logger.error({ err: contactErr, workspaceId, fromEmail }, 'webhook.resend_inbound.email_channel.contact_create_failed');
      await deadLetterResendEvent(emailData, `Contact creation failed: ${contactErr?.message}`, 'infrastructure_failure', 'pending');
      return;
    }
    contactId = newContact.id;
  }

  // Conversation resolution — contact-based grouping. Same shape as
  // sendDocumentToContact()/sendMessage()'s email branch: one platform:'email'
  // conversation per (workspace, contact), no external_thread_id.
  let conversationId: string;
  const { data: existingConv } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('contact_id', contactId)
    .eq('platform', 'email')
    .maybeSingle();

  if (existingConv) {
    conversationId = existingConv.id;
    await supabaseAdmin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
  } else {
    const { data: newConv, error: convErr } = await supabaseAdmin
      .from('conversations')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        platform: 'email',
        title: fromName || fromEmail,
        last_message_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (convErr || !newConv) {
      logger.error({ err: convErr, workspaceId, contactId }, 'webhook.resend_inbound.email_channel.conversation_create_failed');
      await deadLetterResendEvent(emailData, `Conversation creation failed: ${convErr?.message}`, 'infrastructure_failure', 'pending');
      return;
    }
    conversationId = newConv.id;
  }

  // Insert the message — REPLICA IDENTITY FULL + the supabase_realtime
  // publication (20260903000011) means this INSERT reaches
  // conversations-hub:${workspaceId} exactly like an inbound Instagram DM does.
  // No new realtime plumbing needed.
  const { error: insertErr } = await supabaseAdmin.from('messages').insert({
    workspace_id: workspaceId,
    conversation_id: conversationId,
    direction: 'inbound',
    content: rawText,
    sender_handle: fromEmail,
    status: 'delivered',
    bridge_metadata: { resend_message_id: messageId, sender_email: from },
    metadata: { subject: emailData.subject || null },
  });

  if (insertErr) {
    logger.error({ err: insertErr, workspaceId, conversationId }, 'webhook.resend_inbound.email_channel.message_insert_failed');
    throw insertErr; // Bubble to the route's outer catch -> 500 -> Resend's own retry/backoff.
  }

  logger.info({ workspaceId, conversationId, contactId }, 'webhook.resend_inbound.email_channel.message_created');
}
