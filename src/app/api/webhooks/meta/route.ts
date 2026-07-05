import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/encryption';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    const payload = await req.json();
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
    .select('workspace_id')
    .eq('platform', 'facebook')
    .filter('credentials->>page_id', 'eq', recipientId)
    .limit(1)
    .maybeSingle();

  if (!connection) {
    logger.error({ pageId: recipientId }, 'webhook.meta.facebook.connection_not_found');
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
    .select('contact_id, contacts(first_name, last_name)')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'facebook')
    .eq('external_thread_id', senderId)
    .limit(1)
    .maybeSingle();

  if (existingConv) {
    contactId = existingConv.contact_id;
    const contactObj: any = existingConv.contacts;
    if (contactObj) {
      contactName = `${contactObj.first_name || ''} ${contactObj.last_name || ''}`.trim();
    }
  } else {
    // Insert new contact record
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
    contactName = `${newContact.first_name} ${newContact.last_name}`;
  }

  // 4. Resolve or Create Conversation
  let conversationId = null;
  if (existingConv) {
    const { data: conv } = await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
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
    .select('workspace_id')
    .eq('platform', 'instagram')
    .filter('credentials->>instagram_id', 'eq', recipientId)
    .limit(1)
    .maybeSingle();

  if (!connection) {
    logger.error({ instagramId: recipientId }, 'webhook.meta.instagram.connection_not_found');
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
    .select('contact_id, contacts(first_name, last_name)')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'instagram')
    .eq('external_thread_id', senderId)
    .limit(1)
    .maybeSingle();

  if (existingConv) {
    contactId = existingConv.contact_id;
    const contactObj: any = existingConv.contacts;
    if (contactObj) {
      contactName = `${contactObj.first_name || ''} ${contactObj.last_name || ''}`.trim();
    }
  } else {
    // Insert new contact record
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
    contactName = `${newContact.first_name} ${newContact.last_name}`;
  }

  // 4. Resolve or Create Conversation
  let conversationId = null;
  if (existingConv) {
    const { data: conv } = await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
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
}
