import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { decrypt } from '@/lib/encryption';
import { logger } from '@/shared/logger';
import { MetaAdapter } from '@/lib/meta/MetaAdapter';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verifies X-Hub-Signature-256 (HMAC-SHA256 of the raw body, keyed with META_APP_SECRET) using a
// constant-time comparison. Meta's own docs specify this header format: "sha256=<hex digest>".
function isValidMetaSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;

  const providedHex = signatureHeader.slice('sha256='.length);
  const expectedHex = crypto.createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');

  const providedBuf = Buffer.from(providedHex, 'hex');
  const expectedBuf = Buffer.from(expectedHex, 'hex');

  if (providedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

// A Page/IG/WABA ID that doesn't match any platform_connections row means an inbound message
// is silently dropped after Meta already delivered it successfully (we still ack 200 to Meta,
// which is correct — otherwise Meta retries/disables the subscription). Without this, that drop
// was previously visible only in ephemeral server logs. Reuses webhook_dead_letters (already
// used for other inbound-webhook failure classes, see api/admin/dead-letters) purely as a
// durable, queryable record — not wired into the existing replay flow, since there's no
// request to replay, just a routing gap to fix (reconnect the account, or fix a stale
// platform_connections row).
async function recordConnectionNotFound(errorType: string, externalId: string, rawEvent: any): Promise<void> {
  const { error } = await supabase.from('webhook_dead_letters').insert({
    provider: 'meta',
    payload: { externalId, event: rawEvent },
    error: `No platform_connections row matched external id ${externalId}`,
    error_type: errorType,
    retry_state: 'unresolved',
  });
  if (error) {
    logger.error({ err: error, errorType, externalId }, 'webhook.meta.connection_not_found.dead_letter_insert_failed');
  }
}

// GET Handler for Webhook Verification Challenge
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    logger.info({}, 'webhook.meta.verification.success');
    return new Response(challenge || '', { status: 200 });
  }

  logger.warn({}, 'webhook.meta.verification.token_mismatch');
  return new Response('Forbidden', { status: 403 });
}

// POST Handler for Meta Webhook Events (Messenger, Instagram, WhatsApp)
export async function POST(req: Request) {
  try {
    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) {
      throw new Error('[FATAL] META_APP_SECRET env var is not configured');
    }

    // Read the raw, unparsed body — signature validation is byte-sensitive, so this must
    // happen before any JSON.parse / re-serialization.
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('x-hub-signature-256');

    if (!isValidMetaSignature(rawBody, signatureHeader, appSecret)) {
      logger.warn({ hasSignatureHeader: !!signatureHeader }, 'webhook.meta.signature.invalid');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = JSON.parse(rawBody);
    logger.info({ payload }, 'webhook.meta.received');

    const objectType = payload.object;

    if (objectType === 'page') {
      // Facebook Page Messenger Event
      for (const entry of payload.entry || []) {
        for (const messagingEvent of entry.messaging || []) {
          // If it is an echo message (message sent from our own page), ignore to prevent infinite loop
          if (messagingEvent.message?.is_echo) {
            logger.info({}, 'webhook.meta.facebook.echo_skipped');
            continue;
          }

          // Handle delivery status update
          if (messagingEvent.delivery) {
            const mids = messagingEvent.delivery.mids || [];
            for (const mid of mids) {
              await supabase
                .from('messages')
                .update({ status: 'delivered' })
                .eq('external_id', mid);
            }
            logger.info({ mids }, 'webhook.meta.facebook.delivery_processed');
          }

          // Handle read status update
          if (messagingEvent.read) {
            const watermark = messagingEvent.read.watermark;
            const senderId = messagingEvent.sender.id;
            // Update all outbound messages in this conversation to 'read' up to watermark
            const { data: conv } = await supabase
              .from('conversations')
              .select('id')
              .eq('platform', 'facebook')
              .eq('external_thread_id', senderId)
              .maybeSingle();

            if (conv) {
              await supabase
                .from('messages')
                .update({ status: 'read' })
                .eq('conversation_id', conv.id)
                .eq('direction', 'outbound')
                .eq('status', 'delivered');
              logger.info({ senderId }, 'webhook.meta.facebook.read_processed');
            }
          }

          if (messagingEvent.message) {
            await handleFacebookMessengerMessage(messagingEvent);
          }
        }
      }
    } else if (objectType === 'instagram') {
      // Instagram DM Event
      for (const entry of payload.entry || []) {
        for (const messagingEvent of entry.messaging || []) {
          // Ignore echo messages
          if (messagingEvent.message?.is_echo) {
            logger.info({}, 'webhook.meta.instagram.echo_skipped');
            continue;
          }

          // Handle delivery status update
          if (messagingEvent.delivery) {
            const mids = messagingEvent.delivery.mids || [];
            for (const mid of mids) {
              await supabase
                .from('messages')
                .update({ status: 'delivered' })
                .eq('external_id', mid);
            }
            logger.info({ mids }, 'webhook.meta.instagram.delivery_processed');
          }

          // Handle read status update
          if (messagingEvent.read) {
            const senderId = messagingEvent.sender.id;
            const { data: conv } = await supabase
              .from('conversations')
              .select('id')
              .eq('platform', 'instagram')
              .eq('external_thread_id', senderId)
              .maybeSingle();

            if (conv) {
              await supabase
                .from('messages')
                .update({ status: 'read' })
                .eq('conversation_id', conv.id)
                .eq('direction', 'outbound')
                .eq('status', 'delivered');
              logger.info({ senderId }, 'webhook.meta.instagram.read_processed');
            }
          }

          if (messagingEvent.message) {
            await handleInstagramDMMessage(messagingEvent);
          }
        }
      }
    } else if (objectType === 'whatsapp_business_account') {
      // WhatsApp Cloud API Event
      for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            const val = change.value;
            const metadata = val?.metadata;
            const messages = val?.messages || [];
            const statuses = val?.statuses || [];

            // Process status updates
            for (const statusObj of statuses) {
              const msgStatus = statusObj.status; // 'sent', 'delivered', 'read', 'failed'
              const extId = statusObj.id;
              const errorObj = statusObj.errors?.[0];

              const updateData: any = { status: msgStatus };
              if (msgStatus === 'failed' && errorObj) {
                updateData.metadata = { error_message: errorObj.message || 'WhatsApp message delivery failed' };
              }

              const { error: updErr } = await supabase
                .from('messages')
                .update(updateData)
                .eq('external_id', extId);
              
              if (updErr) {
                logger.error({ err: updErr, msgStatus, extId }, 'webhook.meta.whatsapp.status_update.failed');
              } else {
                logger.info({ msgStatus, extId }, 'webhook.meta.whatsapp.status_processed');
              }
            }

            // Process inbound messages
            const webhookContacts = val?.contacts || [];
            for (const message of messages) {
              await handleWhatsAppMessage(message, metadata, webhookContacts);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    logger.error({ err: error }, 'webhook.meta.processing.failed');
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}

async function processInboundComplianceAndWindow(
  supabase: any,
  workspaceId: string,
  conversationId: string,
  contactId: string,
  platform: string,
  messageText: string
) {
  const textNormalized = (messageText || '').trim().toLowerCase();
  
  // 1. Check Compliance Opt-Out / Opt-In keywords
  if (['stop', 'unsubscribe', 'remove'].includes(textNormalized)) {
    // Update contact status
    await supabase
      .from('contacts')
      .update({
        opted_in: false,
        opted_out: true,
        opt_out_date: new Date().toISOString()
      })
      .eq("id", contactId).eq("workspace_id", workspaceId);

    // Insert internal compliance note
    await supabase.from('messages').insert({
      workspace_id: workspaceId,
      conversation_id: conversationId,
      direction: 'note',
      content: 'SYSTEM COMPLIANCE NOTE: Contact requested opt-out (STOP/UNSUBSCRIBE). Outbound marketing blocked.',
      sender_handle: 'system',
      status: 'sent',
      sent_at: new Date().toISOString()
    });
  } else if (['start', 'subscribe'].includes(textNormalized)) {
    // Update contact status
    await supabase
      .from('contacts')
      .update({
        opted_in: true,
        opted_out: false,
        opt_out_date: null
      })
      .eq("id", contactId).eq("workspace_id", workspaceId);

    // Insert internal compliance note
    await supabase.from('messages').insert({
      workspace_id: workspaceId,
      conversation_id: conversationId,
      direction: 'note',
      content: 'SYSTEM COMPLIANCE NOTE: Contact opted in (START/SUBSCRIBE). Outbound communication enabled.',
      sender_handle: 'system',
      status: 'sent',
      sent_at: new Date().toISOString()
    });
  }

  // 2. WhatsApp 24h window update
  if (platform === 'whatsapp') {
    await supabase
      .from('conversations')
      .update({
        last_customer_message_at: new Date().toISOString(),
        last_message_at: new Date().toISOString()
      })
      .eq("id", conversationId).eq("workspace_id", workspaceId);
  }
}

// A stored contact name is one of our own placeholders (never a real synced name) if it
// still matches the exact "{Platform} User" + truncated-id shape the webhook falls back to.
function isPlaceholderName(firstName: string | null | undefined, lastName: string | null | undefined, platformLabel: string, senderId: string): boolean {
  return firstName === `${platformLabel} User` && lastName === senderId.substring(0, 8);
}

const PROFILE_REFRESH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Fetches a contact's real name/avatar from Meta on first contact, or on a periodic
// refresh (>30 days since the last attempt — success or failure), and writes it to the
// contacts row. Always stamps profile_synced_at, even on failure, so a permission denial
// doesn't cause a live Graph API call on every single inbound message from that sender.
// Returns the display name to use for the conversation title (real name if synced,
// otherwise the existing/placeholder name unchanged).
async function syncContactProfile(params: {
  platform: 'facebook' | 'instagram';
  platformLabel: string;
  senderId: string;
  contactId: string;
  credentials: any;
  currentFirstName: string | null;
  currentLastName: string | null;
  profileSyncedAt: string | null;
}): Promise<string> {
  const { platform, platformLabel, senderId, contactId, credentials, currentFirstName, currentLastName, profileSyncedAt } = params;

  const isPlaceholder = isPlaceholderName(currentFirstName, currentLastName, platformLabel, senderId);
  const isStale = !profileSyncedAt || (Date.now() - new Date(profileSyncedAt).getTime()) > PROFILE_REFRESH_MAX_AGE_MS;

  const fallbackName = `${currentFirstName || ''} ${currentLastName || ''}`.trim();

  if (!isPlaceholder && !isStale) {
    return fallbackName;
  }

  const adapter = new MetaAdapter(credentials);
  const update: any = { profile_synced_at: new Date().toISOString() };
  let resultName = fallbackName;

  if (platform === 'facebook') {
    const profile = await adapter.fetchFacebookProfile(senderId);
    if (profile.success && (profile.firstName || profile.lastName)) {
      update.first_name = profile.firstName || '';
      update.last_name = profile.lastName || '';
      if (profile.profilePicUrl) update.avatar_url = profile.profilePicUrl;
      resultName = `${update.first_name} ${update.last_name}`.trim();
      logger.info({ senderId, contactId }, 'webhook.meta.facebook.profile_sync.succeeded');
    } else {
      logger.warn({ senderId, contactId, reason: profile.error }, 'webhook.meta.facebook.profile_sync.fallback_placeholder');
    }
  } else {
    const profile = await adapter.fetchInstagramProfile(senderId);
    if (profile.success && profile.name) {
      const [firstName, ...rest] = profile.name.split(' ');
      update.first_name = firstName || profile.name;
      update.last_name = rest.join(' ');
      if (profile.profilePicUrl) update.avatar_url = profile.profilePicUrl;
      resultName = profile.name;
      logger.info({ senderId, contactId }, 'webhook.meta.instagram.profile_sync.succeeded');
    } else {
      logger.warn({ senderId, contactId, reason: profile.error }, 'webhook.meta.instagram.profile_sync.fallback_placeholder');
    }
  }

  const { error: updateErr } = await supabase.from('contacts').update(update).eq('id', contactId);
  if (updateErr) {
    logger.error({ err: updateErr, contactId }, 'webhook.meta.profile_sync.contact_update_failed');
  }

  return resultName;
}

// Handler helper for Facebook Messenger
async function handleFacebookMessengerMessage(messagingEvent: any) {
  const senderId = messagingEvent.sender.id; // PSID (Page-Scoped ID)
  const recipientId = messagingEvent.recipient.id; // Page ID
  const messageText = messagingEvent.message.text || '[Attachment/Media]';
  const messageId = messagingEvent.message.mid;
  const attachments = messagingEvent.message.attachments || [];

  // 1. Resolve workspace by checking platform_connections credentials page_id
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('workspace_id, credentials')
    .eq('platform', 'facebook')
    .filter('credentials->>page_id', 'eq', recipientId)
    .limit(1)
    .maybeSingle();

  if (!connection) {
    logger.error({ pageId: recipientId }, 'webhook.meta.facebook.connection_not_found');
    await recordConnectionNotFound('meta_facebook_connection_not_found', recipientId, messagingEvent);
    return;
  }

  const workspaceId = connection.workspace_id;

  // 2. Check for duplicate messages using message ID (external_id)
  const { data: existingMsg } = await supabase
    .from('messages')
    .select('id')
    .eq('external_id', messageId)
    .limit(1)
    .maybeSingle();

  if (existingMsg) {
    logger.info({ messageId }, 'webhook.meta.facebook.duplicate_message_skipped');
    return;
  }

  // 3. Resolve or Create Contact
  let contactId = null;
  let contactName = 'Facebook User';

  // Find if we have an existing conversation with this PSID
  const { data: existingConv } = await supabase
    .from('conversations')
    .select('contact_id, contacts(first_name, last_name, profile_synced_at)')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'facebook')
    .eq('external_thread_id', senderId)
    .limit(1)
    .maybeSingle();

  if (existingConv) {
    contactId = existingConv.contact_id;
    const contactObj: any = existingConv.contacts;
    if (contactObj) {
      contactName = await syncContactProfile({
        platform: 'facebook',
        platformLabel: 'Facebook',
        senderId,
        contactId,
        credentials: connection.credentials,
        currentFirstName: contactObj.first_name,
        currentLastName: contactObj.last_name,
        profileSyncedAt: contactObj.profile_synced_at,
      });
    }
  } else {
    // Insert placeholder contact first (need a row/id to sync onto), then attempt a
    // live profile fetch immediately — this is "first contact", the primary sync point.
    const { data: newContact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        workspace_id: workspaceId,
        first_name: 'Facebook User',
        last_name: senderId.substring(0, 8),
        source: 'facebook'
      })
      .select()
      .single();

    if (contactError) throw contactError;
    contactId = newContact.id;
    contactName = await syncContactProfile({
      platform: 'facebook',
      platformLabel: 'Facebook',
      senderId,
      contactId,
      credentials: connection.credentials,
      currentFirstName: newContact.first_name,
      currentLastName: newContact.last_name,
      profileSyncedAt: null,
    });
  }

  // 4. Resolve or Create Conversation
  let conversationId = null;
  if (existingConv) {
    const { data: conv } = await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString(), title: contactName })
      .eq('workspace_id', workspaceId)
      .eq('platform', 'facebook')
      .eq('external_thread_id', senderId)
      .select('id')
      .single();

    conversationId = conv.id;
  } else {
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        platform: 'facebook',
        external_thread_id: senderId,
        title: contactName,
        last_message_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (convError) throw convError;
    conversationId = newConv.id;
  }

  // 5. Build Media Metadata if exists
  let metadata: any = { provider_message_id: messageId };
  if (attachments.length > 0) {
    const att = attachments[0];
    metadata.media_url = att.payload?.url || null;
    metadata.media_type = att.type === 'file' ? 'application/octet-stream' : `${att.type}/unknown`;
  }

  // 6. Insert Message
  await supabase.from('messages').insert({
    workspace_id: workspaceId,
    conversation_id: conversationId,
    direction: 'inbound',
    content: messageText,
    sender_handle: senderId,
    status: 'delivered',
    external_id: messageId,
    metadata: metadata
  });

  // Process compliance and SLA
  await processInboundComplianceAndWindow(
    supabase,
    workspaceId,
    conversationId,
    contactId,
    'facebook',
    messageText
  );
}

// Handler helper for Instagram DMs
async function handleInstagramDMMessage(messagingEvent: any) {
  const senderId = messagingEvent.sender.id; // IGSID (Instagram-Scoped ID)
  const recipientId = messagingEvent.recipient.id; // Instagram Business Account ID
  const messageText = messagingEvent.message.text || '[Attachment/Media]';
  const messageId = messagingEvent.message.mid;
  const attachments = messagingEvent.message.attachments || [];

  // 1. Resolve workspace by checking platform_connections credentials instagram_id
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('workspace_id, credentials')
    .eq('platform', 'instagram')
    .filter('credentials->>instagram_id', 'eq', recipientId)
    .limit(1)
    .maybeSingle();

  if (!connection) {
    logger.error({ instagramId: recipientId }, 'webhook.meta.instagram.connection_not_found');
    await recordConnectionNotFound('meta_instagram_connection_not_found', recipientId, messagingEvent);
    return;
  }

  const workspaceId = connection.workspace_id;

  // 2. Check for duplicate messages using message ID (external_id)
  const { data: existingMsg } = await supabase
    .from('messages')
    .select('id')
    .eq('external_id', messageId)
    .limit(1)
    .maybeSingle();

  if (existingMsg) {
    logger.info({ messageId }, 'webhook.meta.instagram.duplicate_message_skipped');
    return;
  }

  // 3. Resolve or Create Contact
  let contactId = null;
  let contactName = 'Instagram User';

  // Find if we have an existing conversation with this IGSID
  const { data: existingConv } = await supabase
    .from('conversations')
    .select('contact_id, contacts(first_name, last_name, profile_synced_at)')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'instagram')
    .eq('external_thread_id', senderId)
    .limit(1)
    .maybeSingle();

  if (existingConv) {
    contactId = existingConv.contact_id;
    const contactObj: any = existingConv.contacts;
    if (contactObj) {
      contactName = await syncContactProfile({
        platform: 'instagram',
        platformLabel: 'Instagram',
        senderId,
        contactId,
        credentials: connection.credentials,
        currentFirstName: contactObj.first_name,
        currentLastName: contactObj.last_name,
        profileSyncedAt: contactObj.profile_synced_at,
      });
    }
  } else {
    // Insert placeholder contact first (need a row/id to sync onto), then attempt a
    // live profile fetch immediately — this is "first contact", the primary sync point.
    const { data: newContact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        workspace_id: workspaceId,
        first_name: 'Instagram User',
        last_name: senderId.substring(0, 8),
        source: 'instagram'
      })
      .select()
      .single();

    if (contactError) throw contactError;
    contactId = newContact.id;
    contactName = await syncContactProfile({
      platform: 'instagram',
      platformLabel: 'Instagram',
      senderId,
      contactId,
      credentials: connection.credentials,
      currentFirstName: newContact.first_name,
      currentLastName: newContact.last_name,
      profileSyncedAt: null,
    });
  }

  // 4. Resolve or Create Conversation
  let conversationId = null;
  if (existingConv) {
    const { data: conv } = await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString(), title: contactName })
      .eq('workspace_id', workspaceId)
      .eq('platform', 'instagram')
      .eq('external_thread_id', senderId)
      .select('id')
      .single();

    conversationId = conv.id;
  } else {
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        platform: 'instagram',
        external_thread_id: senderId,
        title: contactName,
        last_message_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (convError) throw convError;
    conversationId = newConv.id;
  }

  // 5. Build Media Metadata if exists
  let metadata: any = { provider_message_id: messageId };
  if (attachments.length > 0) {
    const att = attachments[0];
    metadata.media_url = att.payload?.url || null;
    metadata.media_type = att.type === 'file' ? 'application/octet-stream' : `${att.type}/unknown`;
  }

  // 6. Insert Message
  await supabase.from('messages').insert({
    workspace_id: workspaceId,
    conversation_id: conversationId,
    direction: 'inbound',
    content: messageText,
    sender_handle: senderId,
    status: 'delivered',
    external_id: messageId,
    metadata: metadata
  });

  // Process compliance and SLA
  await processInboundComplianceAndWindow(
    supabase,
    workspaceId,
    conversationId,
    contactId,
    'instagram',
    messageText
  );
}

// Handler helper for WhatsApp Cloud API
async function handleWhatsAppMessage(message: any, metadata: any, webhookContacts: any[] = []) {
  const fromNumber = message.from; // Sender Phone (e.g. "27721234567")
  const recipientPhoneId = metadata?.phone_number_id; // Recipient WhatsApp Phone Number ID
  const messageId = message.id;

  // 1. Resolve workspace by checking platform_connections credentials phone_number_id
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('workspace_id, credentials')
    .eq('platform', 'whatsapp')
    .filter('credentials->>phone_number_id', 'eq', recipientPhoneId)
    .limit(1)
    .maybeSingle();

  if (!connection) {
    logger.error({ phoneNumberId: recipientPhoneId }, 'webhook.meta.whatsapp.connection_not_found');
    await recordConnectionNotFound('meta_whatsapp_connection_not_found', recipientPhoneId, message);
    return;
  }

  const workspaceId = connection.workspace_id;

  // 2. Check for duplicate messages using message ID (external_id)
  const { data: existingMsg } = await supabase
    .from('messages')
    .select('id')
    .eq('external_id', messageId)
    .limit(1)
    .maybeSingle();

  if (existingMsg) {
    logger.info({ messageId }, 'webhook.meta.whatsapp.duplicate_message_skipped');
    return;
  }

  // 3. Normalize Phone Number standard (e.g., prefix with +)
  const cleanPhone = fromNumber.startsWith('+') ? fromNumber : `+${fromNumber}`;

  // 4. Resolve or Create Contact using existing CRM matching logic by Phone
  let contactId = null;
  let contactName = `WhatsApp User (${cleanPhone})`;

  const { data: existingContact } = await supabase
    .from('contacts')
    .select('id, first_name, last_name')
    .eq('workspace_id', workspaceId)
    .eq('phone', cleanPhone)
    .limit(1)
    .maybeSingle();

  if (existingContact) {
    contactId = existingContact.id;
    contactName = `${existingContact.first_name || ''} ${existingContact.last_name || ''}`.trim();
  } else {
    // Get WhatsApp Profile Name
    const contactObj = webhookContacts.find((c: any) => c.wa_id === fromNumber);
    const profileName = contactObj?.profile?.name || 'WhatsApp User';

    // Create new contact record
    const { data: newContact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        workspace_id: workspaceId,
        first_name: profileName,
        last_name: 'User',
        phone: cleanPhone,
        source: 'whatsapp'
      })
      .select()
      .single();

    if (contactError) throw contactError;
    contactId = newContact.id;
    contactName = `${newContact.first_name} ${newContact.last_name}`;
  }

  // 5. Resolve or Create Conversation
  let conversationId = null;
  const { data: existingConv } = await supabase
    .from('conversations')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'whatsapp')
    .eq('external_thread_id', cleanPhone)
    .limit(1)
    .maybeSingle();

  if (existingConv) {
    const { data: conv } = await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', existingConv.id)
      .select('id')
      .single();
    
    conversationId = conv.id;
  } else {
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        platform: 'whatsapp',
        external_thread_id: cleanPhone,
        title: contactName,
        last_message_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (convError) throw convError;
    conversationId = newConv.id;
  }

  // 6. WhatsApp Media Processing (retrieve source URL from WABA API)
  let messageText = '';
  let msgMetadata: any = { provider_message_id: messageId };
  const messageType = message.type;

  if (messageType === 'text') {
    messageText = message.text?.body || '';
  } else {
    messageText = '[Media received]';
    const mediaObj = message[messageType];
    if (mediaObj && mediaObj.id) {
      msgMetadata.media_id = mediaObj.id;
      msgMetadata.mime_type = mediaObj.mime_type || `${messageType}/unknown`;
      msgMetadata.caption = mediaObj.caption || null;
      
      // Attempt live Graph API media resolution or fallback to sandbox mock asset URLs
      const credentials = connection.credentials as any;
      if (credentials?.system_user_access_token_encrypted && !recipientPhoneId.startsWith('mock_')) {
        try {
          const decryptedToken = decrypt(credentials.system_user_access_token_encrypted);
          const mediaFetch = await fetch(`https://graph.facebook.com/v18.0/${mediaObj.id}`, {
            headers: { 'Authorization': `Bearer ${decryptedToken}` }
          });
          if (mediaFetch.ok) {
            const mediaJson = await mediaFetch.json();
            msgMetadata.media_url = mediaJson.url;
          }
        } catch (fetchErr: any) {
          logger.error({ err: fetchErr, mediaId: mediaObj.id }, 'webhook.meta.whatsapp.media_fetch.failed');
        }
      }
      
      // Sandbox/Mock Fallback Assets if url is unresolved
      if (!msgMetadata.media_url) {
        if (messageType === 'image') {
          msgMetadata.media_url = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500';
        } else if (messageType === 'video') {
          msgMetadata.media_url = 'https://www.w3schools.com/html/mov_bbb.mp4';
        } else if (messageType === 'audio' || messageType === 'voice') {
          msgMetadata.media_url = 'https://www.w3schools.com/html/horse.mp3';
        } else {
          msgMetadata.media_url = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
        }
      }
    }
  }

  // 7. Insert Message
  await supabase.from('messages').insert({
    workspace_id: workspaceId,
    conversation_id: conversationId,
    direction: 'inbound',
    content: messageText,
    sender_handle: cleanPhone,
    status: 'delivered',
    external_id: messageId,
    metadata: msgMetadata
  });

  // Process compliance and SLA
  await processInboundComplianceAndWindow(
    supabase,
    workspaceId,
    conversationId,
    contactId,
    'whatsapp',
    messageText
  );

  // Automated replies (keyword-trigger chatbot) — checked AFTER the
  // compliance/STOP-START handling above, and only for real text messages
  // (media captions aren't reliable trigger text). Never fires for a
  // contact who is opted out, including one that just opted out via this
  // very message.
  if (messageType === 'text') {
    await maybeSendWhatsAppAutomatedReply(workspaceId, conversationId, contactId, connection.credentials, cleanPhone, messageText);
  }
}

// Matches inbound WhatsApp text against this workspace's active
// whatsapp_bot_rules (simple keyword/contains/regex match, first match by
// priority wins — see 20260808000004_whatsapp_broadcast_and_bot.sql) and
// sends the configured canned reply via the same MetaAdapter used for
// broadcasts and agent replies. A reply here fires because the contact just
// messaged in, so the 24h session window is guaranteed open — 'text' replies
// never need a template; 'template' is offered only for workspaces that
// prefer a pre-approved formatted message.
async function maybeSendWhatsAppAutomatedReply(
  workspaceId: string,
  conversationId: string,
  contactId: string,
  credentials: any,
  toPhone: string,
  messageText: string
) {
  const { data: contact } = await supabase
    .from('contacts')
    .select('opted_out')
    .eq('id', contactId)
    .maybeSingle();
  if (contact?.opted_out) return;

  const { data: rules } = await supabase
    .from('whatsapp_bot_rules')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('active', true)
    .order('priority', { ascending: true });

  if (!rules || rules.length === 0) return;

  const normalized = (messageText || '').trim();
  const lower = normalized.toLowerCase();

  const matchedRule = rules.find((rule: any) => {
    if (rule.match_type === 'exact') return lower === (rule.match_value || '').trim().toLowerCase();
    if (rule.match_type === 'contains') return lower.includes((rule.match_value || '').trim().toLowerCase());
    if (rule.match_type === 'regex') {
      try {
        return new RegExp(rule.match_value, 'i').test(normalized);
      } catch {
        return false;
      }
    }
    return false;
  });

  if (!matchedRule) return;

  const adapter = new MetaAdapter(credentials);
  let result: { success: boolean; externalId?: string; error?: string };
  if (matchedRule.reply_type === 'template' && matchedRule.reply_template_name) {
    result = await adapter.sendWhatsAppTemplate(
      toPhone,
      matchedRule.reply_template_name,
      matchedRule.reply_template_language || 'en_US',
      matchedRule.reply_template_params || []
    );
  } else {
    result = await adapter.sendWhatsApp(toPhone, matchedRule.reply_text || '');
  }

  if (result.success) {
    await supabase.from('messages').insert({
      workspace_id: workspaceId,
      conversation_id: conversationId,
      direction: 'outbound',
      content: matchedRule.reply_type === 'template' ? `[Template: ${matchedRule.reply_template_name}]` : (matchedRule.reply_text || ''),
      sender_handle: 'whatsapp_bot',
      status: 'sent',
      external_id: result.externalId,
      metadata: { automated_reply: true, rule_id: matchedRule.id }
    });
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);
    logger.info({ ruleId: matchedRule.id, conversationId }, 'webhook.meta.whatsapp.bot_reply.sent');
  } else {
    logger.error({ err: result.error, ruleId: matchedRule.id }, 'webhook.meta.whatsapp.bot_reply.failed');
  }
}
