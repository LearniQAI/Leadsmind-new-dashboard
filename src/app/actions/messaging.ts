'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId, requireWorkspaceAccess } from '@/lib/auth';
import { createOAuthStateNonce } from '@/lib/oauth/stateNonce';
import { sendEmail } from '@/lib/email';
import { dispatchOutboundMessage } from '@/lib/messaging/dispatchOutboundMessage';
import { resolveSenderGmailMailbox } from '@/lib/gmail/send';
import { workspaceInboundAddress } from '@/lib/email/inboundAddress';
import { withSmsConnectionStatus } from '@/lib/messaging/smsConnectionStatus';
import { encrypt, decrypt } from '@/lib/encryption';
import { getWorkspaceEmailConfig } from '@/lib/email/resolveConfig';
import { EmailAutomationService } from '@/lib/automations/EmailAutomationService';
import { UnifiedActivityEngine } from '@/lib/crm/UnifiedActivityEngine';
import { logger } from '@/shared/logger';
import { isCloudApiHealthy } from '@/lib/messaging/cloudApiHealth';
import { toClientError } from '@/shared/errors/AppError';
import { subscribeWabaToMetaWebhook } from '@/lib/meta/subscribeWebhook';
import { checkWhatsAppSendAllowed } from '@/lib/messaging/whatsappSendGuard';
import { toSafeConnection } from '@/lib/messaging/safeConnections';
import { isMetaMockMode, isMockValue, MOCK_CREDENTIALS_REJECTED, META_NOT_CONFIGURED } from '@/lib/meta/mockMode';

export async function getMetaAuthUrl(targetPlatform?: string, returnTo?: 'social') {
	// Mints a random opaque nonce bound server-side to the real authenticated user + their
	// real (session-verified) workspace — the OAuth state param is never the workspace_id
	// itself. requireWorkspaceAccess() (inside createOAuthStateNonce) throws if unauthenticated
	// or not a real member, which is the correct behavior for a connect-flow initiator.
	const { nonce, workspaceId } = await createOAuthStateNonce('meta', {
    ...(targetPlatform ? { platform: targetPlatform } : {}),
    ...(returnTo ? { returnTo } : {}),
  });
	const appId = process.env.META_APP_ID;
	const redirectBase = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
	const metaRedirectUri = `${redirectBase}/api/auth/meta/callback`;

	if (!appId || appId === 'placeholder' || !process.env.META_APP_ID) {
		// Placeholder app id: only usable in explicit mock mode (never production). Otherwise connecting is unavailable.
		if (!isMetaMockMode()) throw new Error(META_NOT_CONFIGURED);
		return `${metaRedirectUri}?code=mock_code&state=${nonce}`;
	}

	// pages_read_user_content, pages_manage_engagement, instagram_basic, and instagram_manage_comments
	// were added for Task 93 (comment inbox) — confirmed missing by live-testing real Graph API calls
	// against real posts (not assumed from docs alone): Facebook comment read 400'd asking for
	// pages_read_user_content; Meta's own /{ig-comment-id}/replies docs list instagram_basic +
	// instagram_manage_comments as required and a live reply attempt 400'd with Missing Permission;
	// pages_manage_engagement is Meta's documented requirement for POST /{comment-id}/comments.
	// read_insights (Page Insights) and instagram_manage_insights (IG media/account insights) added
	// for Task 94 (engagement analytics) — neither was previously requested by this flow, so every
	// currently-connected token is missing them regardless of Meta Dashboard product status; a fresh
	// reconnect is required before any analytics call can succeed, same pattern as Task 93's scopes.
	const scope = 'pages_show_list,pages_messaging,pages_manage_metadata,pages_read_engagement,pages_read_user_content,pages_manage_posts,pages_manage_engagement,read_insights,instagram_basic,instagram_manage_messages,instagram_manage_comments,instagram_content_publish,instagram_manage_insights,whatsapp_business_messaging,whatsapp_business_management,business_management';
	const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(metaRedirectUri)}&scope=${scope}&response_type=code&state=${nonce}`;
	logger.info({ scope, workspaceId }, 'messaging.meta_oauth.url_generated');
	return url;
}

const WA_WEBHOOK_WARNING = 'WhatsApp connected, but Meta rejected the webhook subscription. Incoming WhatsApp messages, opt-outs and delivery receipts will not be received until this is fixed — try reconnecting.';

// Subscribes our app to the WhatsApp Business Account (without it Meta sends no WhatsApp events at
// all — see subscribeWabaToMetaWebhook) and returns the health fields to store on the connection.
// Mock ids/tokens (dev) skip the call, same convention as validateMetaPlatformCredentials.
async function whatsappWebhookHealth(wabaId: string | null | undefined, token: string) {
  if ((isMockValue(wabaId) || isMockValue(token)) && isMetaMockMode()) {
    return { ok: true, status: 'connected', credentials: { health_status: 'connected' } };
  }
  const sub = wabaId
    ? await subscribeWabaToMetaWebhook(wabaId, token)
    : { success: false, error: 'No WhatsApp Business Account id to subscribe' };
  if (!sub.success) logger.error({ wabaId, error: sub.error }, 'messaging.whatsapp.webhook_subscription_failed');
  return sub.success
    ? { ok: true, status: 'connected', credentials: { health_status: 'connected' } }
    : { ok: false, status: 'error', credentials: { health_status: 'webhook_subscription_failed', webhook_subscription_error: sub.error } };
}

async function validateMetaPlatformCredentials(platform: string, data: any) {
  const token = platform === 'whatsapp' ? data.systemUserAccessToken : data.pageAccessToken;
  const id = platform === 'facebook' ? data.pageId : 
             platform === 'instagram' ? data.instagramBusinessAccountId : 
             data.phoneNumberId;

  if (!token || !id) {
    throw new Error('Required configuration fields are missing.');
  }

  // A mock token/ID skips validation ONLY in explicit mock mode (never in production; callers reject it earlier).
  if ((isMockValue(token) || isMockValue(id)) && isMetaMockMode()) {
    logger.info({ platform }, 'messaging.platform_validation.mock_skip');
    return {
      name: platform === 'facebook' ? (data.pageName || 'LeadsMind Page') :
            platform === 'instagram' ? 'ig_leadsmind' : 'LeadsMind WhatsApp Business',
      extra: platform === 'whatsapp' ? '+1 (555) 019-2834' : undefined
    };
  }

  try {
    if (platform === 'facebook') {
      const response = await fetch(`https://graph.facebook.com/v18.0/${id}?fields=name&access_token=${token}`);
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error?.message || 'Page validation failed.');
      }
      return { name: resData.name };
    } else if (platform === 'instagram') {
      const response = await fetch(`https://graph.facebook.com/v18.0/${id}?fields=username&access_token=${token}`);
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error?.message || 'Instagram validation failed.');
      }
      return { name: resData.username };
    } else if (platform === 'whatsapp') {
      const response = await fetch(`https://graph.facebook.com/v18.0/${id}?fields=verified_name,display_phone_number&access_token=${token}`);
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error?.message || 'WhatsApp validation failed.');
      }
      return { 
        name: resData.verified_name || 'WhatsApp Business Line',
        extra: resData.display_phone_number
      };
    }
    throw new Error('Unsupported platform validation');
  } catch (err: any) {
    logger.error({ err, platform }, 'messaging.meta_platform_credentials.validation_failed');
    throw new Error('Meta API validation failed. Please check your credentials.');
  }
}

// True when any credential field of a connect payload is a `mock_` test value.
function hasMockCredential(data: any): boolean {
  return [data?.pageId, data?.pageAccessToken, data?.userAccessToken, data?.instagramBusinessAccountId, data?.phoneNumberId, data?.whatsappBusinessAccountId, data?.systemUserAccessToken].some(isMockValue);
}

export async function connectPlatformManually(platform: string, data: any) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    // A mock_ value would create a "connected" line that reports every send as successful while nothing is sent.
    if (!isMetaMockMode() && hasMockCredential(data)) return { error: MOCK_CREDENTIALS_REJECTED };

    // 1. Validate credentials against Meta Graph API
    const validation = await validateMetaPlatformCredentials(platform, data);

    const supabase = await createServerClient();
    let credentials: any = {};
    let status = 'connected';
    let warning: string | undefined;

    if (platform === 'facebook') {
      credentials = {
        page_id: data.pageId,
        page_name: validation.name || data.pageName || 'LeadsMind Page',
        page_access_token_encrypted: encrypt(data.pageAccessToken),
        user_access_token_encrypted: encrypt(data.userAccessToken || data.pageAccessToken),
        health_status: 'connected'
      };
    } else if (platform === 'instagram') {
      credentials = {
        instagram_id: data.instagramBusinessAccountId,
        instagram_username: validation.name || 'IG Account',
        page_id: data.pageId,
        page_access_token_encrypted: encrypt(data.pageAccessToken),
        health_status: 'connected'
      };
    } else if (platform === 'whatsapp') {
      const wa = await whatsappWebhookHealth(data.whatsappBusinessAccountId, data.systemUserAccessToken);
      credentials = {
        phone_number_id: data.phoneNumberId,
        waba_id: data.whatsappBusinessAccountId,
        waba_name: validation.name || 'WhatsApp Business Line',
        phone_number: validation.extra || 'WhatsApp Number',
        system_user_access_token_encrypted: encrypt(data.systemUserAccessToken),
        ...wa.credentials
      };
      status = wa.status;
      if (!wa.ok) warning = WA_WEBHOOK_WARNING;
    } else {
      return { error: 'Invalid platform' };
    }

    const { error } = await supabase.from('platform_connections').upsert({
      workspace_id: workspaceId,
      platform,
      credentials,
      status,
      last_sync_at: new Date().toISOString()
    }, { onConflict: 'workspace_id,platform' });

    if (error) throw error;
    return { success: true, warning };
  } catch (error: any) {
    logger.error({ err: error, platform }, 'messaging.platform_connection.save.failed');
    return { error: 'Failed to save connection' };
  }
}

export async function getConnectedPlatforms() {
 let workspaceId: string | null = null;
 try {
  workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return [];

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('platform_connections')
   .select('platform, status, last_sync_at, credentials')
   .eq('workspace_id', workspaceId);

  if (error) throw error;
  // Project through the allow-list HERE, on the server: `credentials` holds encrypted tokens and this result is handed to
  // client components. Nothing secret may leave this function.
  const rows = (data || []).map((r: any) => toSafeConnection(r));

  const { data: ws } = await supabase.from('workspaces').select('twilio_number').eq('id', workspaceId).maybeSingle();
  return withSmsConnectionStatus(rows, ws?.twilio_number);
 } catch (error) {
  logger.error({ err: error, workspaceId }, 'messaging.platforms.fetch.failed');
  return [];
 }
}

export async function disconnectPlatform(platform: string) {
 let workspaceId: string | null = null;
 try {
  workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { error } = await supabase
   .from('platform_connections')
   .delete()
   .eq('workspace_id', workspaceId)
   .eq('platform', platform);

  if (error) throw error;
  return { success: true };
 } catch (error: any) {
  logger.error({ err: error, workspaceId, platform }, 'messaging.platform.disconnect.failed');
  return { error: 'Failed to disconnect platform' };
 }
}


// Every Hub write that takes a conversation id resolves it HERE first, scoped by workspace_id. A conversation that is not in the
// caller's workspace (another tenant's, deleted, malformed) resolves to [] and the caller must return CONVERSATION_NOT_FOUND
// without writing. RLS is a backstop, not the check: sendMessage used to insert a message row into the caller's workspace that
// pointed at another workspace's conversation.
async function resolveConversationIds(conversationId: string, workspaceId: string): Promise<string[]> {
  const supabase = await createServerClient();
  if (!conversationId.startsWith('contact:')) {
    const { data } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    return data?.id ? [data.id] : [];
  }
  const contactId = conversationId.split(':')[1];
  const { data } = await supabase
    .from('conversations')
    .select('id')
    .eq('contact_id', contactId)
    .eq('workspace_id', workspaceId);
  return data?.map((c: any) => c.id) || [];
}

// Plain optional-field shape so existing callers can keep testing `res.error` on any branch.
type HubActionResult = { success?: boolean; error?: string; code?: string; data?: any };

const CONVERSATION_NOT_FOUND = { success: false as const, error: 'Conversation not found.', code: 'not_found' as const };

export async function getConversations() {
 let workspaceId: string | null = null;
 try {
  workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('conversations')
   .select(`
    id,
    platform,
    title,
    last_message_at,
    contact_id,
    assigned_to,
    status,
    tags,
    last_customer_message_at,
    contacts (id, first_name, last_name, avatar_url, phone, email, opted_in, opted_out, opt_out_date),
    messages (id, external_id, content, direction, sent_at, status, metadata, sender_handle)
   `)
   .eq('workspace_id', workspaceId)
   .order('last_message_at', { ascending: false });

  // Filter messages to just get the latest one per conversation if needed

  if (error) throw error;

  // Real per-user unread counts (conversation_reads), feeding the list's existing unread UI.
  const { data: unread } = await supabase.rpc('conversation_unread_counts', { p_workspace_id: workspaceId });
  const unreadBy = new Map<string, number>(((unread || []) as { conversation_id: string; unread: number }[]).map((u) => [u.conversation_id, u.unread]));
  return { data: (data || []).map((c: any) => ({ ...c, unread_count: unreadBy.get(c.id) || 0 })) };
 } catch (error: any) {
  logger.error({ err: error, workspaceId }, 'messaging.conversations.fetch.failed');
  return { error: 'Failed to fetch conversations' };
 }
}

export async function sendMessage(
  conversationId: string,
  content: string,
  audioUrl?: string,
  transcript?: string,
  clientMessageUuid?: string,
  /** Compose gap fix — a real, display-only email subject (Step 0 decision:
   *  separate from conversation grouping, which stays contact-based). Only
   *  meaningful for a fresh email send; ignored for every other channel and
   *  for a failed-row retry (which keeps its original subject). */
  subject?: string,
) {
  let targetConvId = conversationId;

 try {
  // Previously trusted the active_workspace_id cookie with no membership check before
  // reading platform_connections credentials and dispatching to MetaAdapter (Facebook/
  // Instagram/WhatsApp send). RLS backstops this via check_workspace_access(), but this
  // brings the app-layer check in line with social/publish/route.ts and createSocialPost().
  const { workspaceId, userId } = await requireWorkspaceAccess();

  const supabase = await createServerClient();

  // The conversation must exist IN THIS WORKSPACE before anything is read or written. Not found: typed error, zero writes.
  const ids = await resolveConversationIds(conversationId, workspaceId);
  if (ids.length === 0) return CONVERSATION_NOT_FOUND;
  targetConvId = ids[0];

  // Server-side WhatsApp guards (the composer UI is not a control): never message an opted-out contact, never send
  // free text outside the 24h window. Every other channel passes straight through.
  const blocked = await checkWhatsAppSendAllowed(supabase, workspaceId, targetConvId);
  if (blocked) return blocked;

  // Idempotency (Message Delivery Reliability Part 1). The client stamps a UUID at
  // compose time and re-sends it on any retry / re-click. If we already have a row
  // for this (conversation, uuid):
  //   - still in flight or already succeeded  -> no-op, return success (never a 2nd
  //     Graph API call to a real contact).
  //   - previously FAILED                     -> reuse that same row (flip back to
  //     'sending') so the one-tap Retry re-dispatches in place instead of stacking a
  //     duplicate bubble.
  // The partial unique index unique_client_message_uuid is the race backstop below.
  let msgData: any = null;
  const baseMetadata = {
    transcript: transcript || null,
    audio_url: audioUrl || null,
    ...(clientMessageUuid ? { client_message_uuid: clientMessageUuid } : {}),
  };

  if (clientMessageUuid) {
    const { data: existing } = await supabase
      .from('messages')
      .select('id, status, metadata')
      .eq('workspace_id', workspaceId)
      .eq('conversation_id', targetConvId)
      .eq('client_message_uuid', clientMessageUuid)
      .maybeSingle();

    if (existing) {
      if (existing.status !== 'failed') {
        logger.info(
          { workspaceId, conversationId: targetConvId, clientMessageUuid, existingStatus: existing.status },
          'messaging.message.send.idempotent_skip',
        );
        return { success: true, deduped: true };
      }
      const { error_message, error_code, error_subcode, error_type, fbtrace_id, http_status, ...cleanMeta } = (existing.metadata || {}) as Record<string, unknown>;
      const { data: reactivated, error: reactivateErr } = await supabase
        .from('messages')
        .update({
          status: 'sending',
          metadata: { ...cleanMeta, ...baseMetadata, retry_of_failed: true },
        })
        .eq('id', existing.id)
        .eq('workspace_id', workspaceId)
        .select()
        .single();
      if (reactivateErr) throw reactivateErr;
      msgData = reactivated;
    }
  }

  if (!msgData) {
    const { data: inserted, error } = await supabase
      .from('messages')
      .insert({
        workspace_id: workspaceId,
        conversation_id: targetConvId,
        direction: 'outbound',
        content,
        audio_url: audioUrl || null,
        status: 'sending',
        client_message_uuid: clientMessageUuid || null,
        subject: subject || null,
        metadata: baseMetadata,
      })
      .select()
      .single();

    // Concurrent duplicate submit lost the race to the unique index — the winning
    // row is already dispatching, so this call is an idempotent no-op.
    if (error && (error as any).code === '23505') {
      logger.info(
        { workspaceId, conversationId: targetConvId, clientMessageUuid },
        'messaging.message.send.idempotent_skip_race',
      );
      return { success: true, deduped: true };
    }
    if (error) throw error;
    msgData = inserted;
  }
  
  // Update conversation last_message_at
  await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).in('id', ids).eq('workspace_id', workspaceId);

  // If it's an email platform, send the actual email via Resend
  const { data: conv } = await supabase
   .from('conversations')
   .select('platform, external_thread_id, contacts(id, email, phone, first_name)')
    .eq("id", targetConvId).eq("workspace_id", workspaceId)
   .single();

  let messageFailed = false;
  let errorMessage = '';
  // Part 2: set when dispatchOutboundMessage() has already written the final
  // messages.status + metadata (+ dead letter), so the tail must not double-write.
  let dispatchHandled = false;
  // Part 2: set when the send failed recoverably and a retry is queued — this is
  // NOT an error to the agent (the bubble shows amber "Retrying…", not red).
  let retryScheduled = false;

  if (conv?.platform === 'email') {
   const contact = Array.isArray(conv.contacts) ? conv.contacts[0] : conv.contacts;
   // Routing (Conversations batch 4): a sender with their OWN healthy connected Gmail sends
   // through it (the contact sees their real address; retry queue + dead letters like Meta).
   // Anyone else keeps the Resend inbox-address path below, unchanged. The mailbox is always
   // the caller's own — never a teammate's, never one named on the message row. Voice notes keep
   // their bespoke Resend template for now.
   const gmailMailbox = contact?.email && !audioUrl ? await resolveSenderGmailMailbox(workspaceId, userId) : null;
   if (contact?.email && gmailMailbox) {
    const outcome = await dispatchOutboundMessage(
      { messagesClient: supabase },
      {
        message: msgData,
        platform: 'email',
        recipient: contact.email,
        credentials: null,
        attemptNumber: 1,
        context: 'inline',
        email: { mailboxId: gmailMailbox.id, senderUserId: userId },
      },
    );
    dispatchHandled = true;
    if (outcome.outcome === 'failed') {
      messageFailed = true;
      errorMessage = outcome.error;
    } else if (outcome.outcome === 'retrying') {
      retryScheduled = true;
    }
   } else if (contact?.email) {
    // Email Channel: a Reply-To on this workspace's inbound receiving address
    // so a recipient's reply lands back in this conversation instead of at the
    // generic no-reply `From`. Must be passed as sendEmail's dedicated
    // `replyTo` param — Resend ignores a `Reply-To` key set via `headers`,
    // which is why replies were previously bouncing to noreply@leadsmind.io.
    // Best-effort — a missing slug (shouldn't happen; workspaces.slug is
    // NOT NULL) just skips it rather than failing the send.
    let replyTo: string | undefined;
    let workspaceName = 'LeadsMind';
    try {
      const { data: wsRow } = await supabase.from('workspaces').select('slug, name').eq('id', workspaceId).maybeSingle();
      if (wsRow?.slug) replyTo = workspaceInboundAddress(wsRow.slug);
      if (wsRow?.name) workspaceName = wsRow.name;
    } catch (slugErr) {
      logger.error({ err: slugErr, workspaceId }, 'messaging.email.reply_to_lookup.failed');
    }
    logger.info({ workspaceId, conversationId: targetConvId, replyTo: replyTo || null, hasAudio: !!audioUrl }, 'messaging.email.dispatch');
    // Compose gap fix: a real agent-typed subject (Step 0 decision — display-
    // only, doesn't touch conversation grouping). Falls back to a sensible
    // default for a reply where no subject was carried through.
    const emailSubject = subject?.trim() || `New message from ${workspaceName}`;

    try {
     if (audioUrl) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const { data: sender } = await supabase
          .from('users')
          .select('first_name, last_name, profile_photo_url, job_title, identity_color, avatar_preset_id')
          .eq('id', currentUser?.id)
          .maybeSingle();

        const senderData = {
          first_name: sender?.first_name || null,
          last_name: sender?.last_name || null,
          full_name: sender ? `${sender.first_name || ''} ${sender.last_name || ''}`.trim() : 'Team Member',
          job_title: sender?.job_title || null,
          identity_color: sender?.identity_color || null,
          profile_photo_url: sender?.profile_photo_url || null,
          avatar_preset_id: sender?.avatar_preset_id || null
        };

        try {
          const { sendVoiceNoteEmail } = await import('@/lib/voicenotes/voiceNoteEmail');
          await sendVoiceNoteEmail({
            workspaceId,
            messageId: msgData.id,
            toEmail: contact.email,
            sender: senderData,
            audioUrl,
            audioDuration: undefined,
            message: content || undefined,
            replyTo,
            subject: subject?.trim() || undefined
          });
        } catch (emailErr) {
          logger.error({ err: emailErr, workspaceId, conversationId: targetConvId }, 'messaging.voice_note_email.send.failed');
        }
      } else {
       await sendEmail({
        to: contact.email,
        subject: emailSubject,
        text: content,
        replyTo,
       });
     }
    await supabase.from('messages').update({ status: 'delivered' }).eq("id", msgData.id).eq("workspace_id", workspaceId);
    } catch (emailErr: any) {
     logger.error({ err: emailErr, workspaceId, conversationId: targetConvId }, 'messaging.email.send.failed');
     messageFailed = true;
     errorMessage = 'Failed to send email';
    }
   } else {
     messageFailed = true;
     errorMessage = 'No email address for contact';
   }
  } else if (conv?.platform === 'sms') {
   const contact = Array.isArray(conv.contacts) ? conv.contacts[0] : conv.contacts;
   if (contact?.phone) {
    try {
     const bridgeAddress = `${contact.phone || ''}@sms.leadsmind.io`;
     
     // Route the SMS reply through the Resend Email Bridge
     await sendEmail({
      to: bridgeAddress,
      subject: 'New SMS Reply from CRM',
      text: content,
     });
     
    await supabase.from('messages').update({ status: 'delivered' }).eq("id", msgData.id).eq("workspace_id", workspaceId);
    } catch (bridgeErr: any) {
     logger.error({ err: bridgeErr, workspaceId, conversationId: targetConvId }, 'messaging.sms_bridge.send.failed');
     messageFailed = true;
     errorMessage = 'Failed to route via SMS Bridge';
    }
   } else {
     messageFailed = true;
     errorMessage = 'No phone number for contact';
   }
  } else if (['facebook', 'instagram', 'whatsapp'].includes(conv?.platform || '')) {
   const { data: conn } = await supabase
    .from('platform_connections')
    .select('credentials')
    .eq('workspace_id', workspaceId)
    .eq('platform', conv!.platform)
    .maybeSingle();

   if (conn?.credentials) {
    if (conv!.platform === 'whatsapp' && audioUrl) {
      // WhatsApp voice notes keep their bespoke sender path and are not routed
      // through the retry queue (Part 2 covers text sends — the PRD's scope).
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { data: sender } = await supabase
        .from('users')
        .select('first_name, last_name, profile_photo_url, job_title, identity_color, avatar_preset_id')
        .eq('id', currentUser?.id)
        .maybeSingle();

      const senderData = {
        first_name: sender?.first_name || null,
        last_name: sender?.last_name || null,
        full_name: sender ? `${sender.first_name || ''} ${sender.last_name || ''}`.trim() : 'Team Member',
        job_title: sender?.job_title || null,
        identity_color: sender?.identity_color || null,
        profile_photo_url: sender?.profile_photo_url || null,
        avatar_preset_id: sender?.avatar_preset_id || null
      };

      const { sendVoiceNoteWhatsApp } = await import('@/lib/voicenotes/voiceNoteWhatsApp');
      const res: any = await sendVoiceNoteWhatsApp({
        workspaceId,
        toNumber: conv!.external_thread_id || '',
        sender: senderData,
        audioUrl
      });

      if (res && res.success) {
        await supabase.from('messages').update({ status: 'sent', external_id: res.externalId }).eq("id", msgData.id).eq("workspace_id", workspaceId);
      } else {
        logger.error({ err: res?.error, workspaceId, conversationId: targetConvId, platform: 'whatsapp' }, 'messaging.meta_adapter.dispatch.failed');
        messageFailed = true;
        errorMessage = res?.error || 'Failed to dispatch message';
      }
    } else {
      // Text send — the single retry-aware path shared with the cron worker.
      // Attempt 1 is inline (10s timeout). A recoverable failure schedules a
      // background retry (status 'retrying'); a permanent one fails now with a
      // real Graph error + a dead-letter row. The helper owns the messages.status
      // + metadata writes for this branch.
      const outcome = await dispatchOutboundMessage(
        { messagesClient: supabase },
        {
          message: msgData,
          platform: conv!.platform,
          recipient: conv!.external_thread_id || '',
          credentials: conn.credentials,
          attemptNumber: 1,
          context: 'inline',
        },
      );
      dispatchHandled = true;
      if (outcome.outcome === 'failed') {
        messageFailed = true;
        errorMessage = outcome.error;
      } else if (outcome.outcome === 'retrying') {
        retryScheduled = true;
      }
    }
   } else {
     messageFailed = true;
     errorMessage = `${conv?.platform} connection not configured`;
   }
  } else {
    // Just mark as sent for other platforms for now
    await supabase.from('messages').update({ status: 'delivered' }).eq("id", msgData.id).eq("workspace_id", workspaceId);
    await supabase.from('messages').update({ status: 'delivered' }).eq("id", msgData.id).eq("workspace_id", workspaceId);
  }

  // Log the activity to the CRM timeline feed if it is a voice note and sending succeeded
  if (audioUrl && !messageFailed) {
    const contact = Array.isArray(conv.contacts) ? conv.contacts[0] : conv.contacts;
    if (contact?.id) {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        await UnifiedActivityEngine.logActivity(
          workspaceId,
          currentUser?.id || null,
          'contact',
          contact.id,
          'voice_note',
          content || `Sent voice note via ${conv?.platform || 'system'}.`,
          {
            channel: conv?.platform || 'email',
            audio_url: audioUrl,
            transcript: transcript,
            destination: conv?.platform === 'email' ? contact.email : contact.phone
          }
        );
      } catch (actErr) {
        logger.error({ err: actErr, workspaceId, conversationId: targetConvId }, 'messaging.voice_activity.log.failed');
      }
    }
  }

    if (messageFailed) {
    // dispatchOutboundMessage() already wrote status='failed' + merged metadata +
    // the dead-letter row for the Meta text path; only the legacy branches
    // (email / sms / whatsapp voice note / connection-not-configured) fall here.
    if (msgData && !dispatchHandled) {
      // Merge onto the existing metadata (a full replace here previously dropped
      // transcript / audio_url / client_message_uuid).
      const failedMetadata = {
        ...(msgData.metadata || {}),
        error_message: errorMessage,
      };
      await supabase.from('messages').update({ status: 'failed', metadata: failedMetadata }).eq("id", msgData.id).eq("workspace_id", workspaceId);
    }
    return { error: errorMessage };
  }

  if (retryScheduled) {
    // Not an error — the message is queued for an automatic retry and the UI
    // shows it as "Retrying…". Realtime will push the next status change.
    return { retrying: true };
  }

  return { success: true };
 } catch (error: any) {
  logger.error({ err: error, conversationId: targetConvId }, 'messaging.message.send.failed');
  return { error: 'Failed to send message' };
 }
}

export async function sendInternalNote(conversationId: string, content: string, senderHandle = 'Agent'): Promise<HubActionResult> {
  let targetConvId = conversationId;
 try {
  const { workspaceId } = await requireWorkspaceAccess();
  const ids = await resolveConversationIds(conversationId, workspaceId);
  if (ids.length === 0) return CONVERSATION_NOT_FOUND;
  targetConvId = ids[0];

  const supabase = await createServerClient();
  const { data: msgData, error } = await supabase
   .from('messages')
   .insert({
    workspace_id: workspaceId,
    conversation_id: targetConvId,
    direction: 'note',
    content,
    status: 'sent',
    sender_handle: senderHandle
   })
   .select()
   .single();

  if (error) throw error;

  // Update conversation last_message_at
  await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).in('id', ids).eq('workspace_id', workspaceId);

  return { success: true, data: msgData };
 } catch (error: any) {
  logger.error({ err: error, conversationId: targetConvId }, 'messaging.internal_note.save.failed');
  return { error: 'Failed to save note' };
 }
}

// Shared by assignment / status / tags: resolve in the workspace, update scoped by workspace_id, and treat "0 rows
// affected" as NOT FOUND instead of success (a foreign or deleted id used to report success while changing nothing).
async function updateConversationFields(conversationId: string, patch: Record<string, unknown>, logTag: string): Promise<HubActionResult | null> {
 try {
  const { workspaceId } = await requireWorkspaceAccess();
  const ids = await resolveConversationIds(conversationId, workspaceId);
  if (ids.length === 0) return CONVERSATION_NOT_FOUND;

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('conversations')
   .update(patch)
   .in('id', ids)
   .eq('workspace_id', workspaceId)
   .select('id');

  if (error) throw error;
  if (!data || data.length === 0) return CONVERSATION_NOT_FOUND;
  return { success: true as const };
 } catch (error: any) {
  logger.error({ err: error, conversationId }, logTag);
  return null;
 }
}

export async function updateConversationAssignment(conversationId: string, assignedTo: string | null): Promise<HubActionResult> {
 // The assignee must be a member of the caller's workspace (an agent cannot be assigned from another tenant).
 if (assignedTo) {
  try {
   const { workspaceId } = await requireWorkspaceAccess();
   const supabase = await createServerClient();
   const { data: member } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', assignedTo)
    .maybeSingle();
   if (!member) return { success: false as const, error: 'Assignee not found in this workspace.', code: 'not_found' as const };
  } catch (error: any) {
   logger.error({ err: error, conversationId }, 'messaging.conversation_assignment.assignee_check.failed');
   return { error: 'Failed to update assignment.' };
  }
 }
 const r = await updateConversationFields(conversationId, { assigned_to: assignedTo }, 'messaging.conversation_assignment.update.failed');
 return r ?? { error: 'Failed to update assignment.' };
}

export async function updateConversationStatus(conversationId: string, status: string): Promise<HubActionResult> {
 const r = await updateConversationFields(conversationId, { status }, 'messaging.conversation_status.update.failed');
 return r ?? { error: 'Failed to update status.' };
}

export async function updateConversationTags(conversationId: string, tags: string[]): Promise<HubActionResult> {
 if (!Array.isArray(tags) || tags.some((t) => typeof t !== 'string')) return { error: 'Failed to update tags.' };
 const r = await updateConversationFields(conversationId, { tags }, 'messaging.conversation_tags.update.failed');
 return r ?? { error: 'Failed to update tags.' };
}

export async function getQuickReplies() {
 let workspaceId: string | null = null;
 try {
  // Previously trusted the active_workspace_id cookie with no membership
  // check — the quick_replies table's RLS policies were also fully open
  // (FOR SELECT/ALL USING (true)), so this was doubly unprotected. The RLS
  // fix (migration 20260721000003) is the primary fix; this app-layer check
  // is defense in depth, consistent with every other fix in this pass.
  ({ workspaceId } = await requireWorkspaceAccess());

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('quick_replies')
   .select('*')
   .eq('workspace_id', workspaceId)
   .order('shortcut', { ascending: true });

  if (error) throw error;
  return { data };
 } catch (error: any) {
  logger.error({ err: error, workspaceId }, 'messaging.quick_replies.fetch.failed');
  return { error: 'Failed to fetch quick replies.' };
 }
}

export async function createQuickReply(shortcut: string, message: string) {
 try {
  const { workspaceId } = await requireWorkspaceAccess();

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('quick_replies')
   .insert({
    workspace_id: workspaceId,
    shortcut,
    message
   })
   .select()
   .single();

  if (error) throw error;
  return { success: true, data };
 } catch (error: any) {
  logger.error({ err: error, shortcut }, 'messaging.quick_reply.create.failed');
  return { error: 'Failed to create quick reply.' };
 }
}

export async function deleteQuickReply(id: string): Promise<HubActionResult> {
 let workspaceId: string | null = null;
 try {
  const supabase = await createServerClient();
  ({ workspaceId } = await requireWorkspaceAccess());
  const { data: deleted, error } = await supabase
   .from('quick_replies')
   .delete()
   .eq("id", id).eq("workspace_id", workspaceId)
   .select('id');

  if (error) throw error;
  if (!deleted || deleted.length === 0) return { success: false as const, error: 'Quick reply not found.', code: 'not_found' as const };
  return { success: true };
 } catch (error: any) {
  logger.error({ err: error, workspaceId, quickReplyId: id }, 'messaging.quick_reply.delete.failed');
  return { error: 'Failed to delete quick reply.' };
 }
}

export async function updateContactConsent(contactId: string, optedIn: boolean, optedOut: boolean): Promise<HubActionResult> {
 let workspaceId: string | null = null;
 try {
  const supabase = await createServerClient();
  ({ workspaceId } = await requireWorkspaceAccess());
  const { data: updated, error } = await supabase
   .from('contacts')
   .update({
     opted_in: optedIn,
     opted_out: optedOut,
     opt_out_date: optedOut ? new Date().toISOString() : null
   })
   .eq("id", contactId).eq("workspace_id", workspaceId)
   .select('id');

  if (error) throw error;
  if (!updated || updated.length === 0) return { success: false as const, error: 'Contact not found.', code: 'not_found' as const };
  return { success: true };
 } catch (error: any) {
  logger.error({ err: error, workspaceId, contactId }, 'messaging.contact_consent.update.failed');
  return { error: 'Failed to update consent.' };
 }
}

// Server-side only (not exported): the decrypted Meta user token. The browser must never receive it.
async function loadMetaOauthSession() {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return null;

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('platform_connections')
      .select('credentials, status')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'facebook')
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const creds = data.credentials as any;
    if (!creds || (!creds.user_access_token_encrypted && !(creds.is_mock && isMetaMockMode()))) {
      return null;
    }

    // A legacy is_mock row is only honoured in explicit mock mode (never production).
    const isMock = !!creds.is_mock && isMetaMockMode();
    const token = creds.user_access_token_encrypted ? decrypt(creds.user_access_token_encrypted) : '';

    return {
      token,
      isMock,
      status: data.status
    };
  } catch (err) {
    logger.error({ err }, 'messaging.meta_oauth_token.fetch.failed');
    return null;
  }
}

// What the connect wizard needs to know: is there a linked Meta session. It used to return the decrypted token itself to
// the browser, which only ever tested it for truthiness.
export async function getMetaOauthToken(): Promise<{ linked: true; isMock: boolean; status: string } | null> {
  const session = await loadMetaOauthSession();
  if (!session || !session.token) return null;
  return { linked: true, isMock: session.isMock, status: session.status };
}

export async function fetchMetaBusinesses() {
  const oauth = await loadMetaOauthSession();
  if (!oauth) throw new Error('Meta account not linked or session expired');

  if (oauth.isMock) {
    return [
      { id: 'mock_biz_1', name: 'LeadsMind Corporate Business' },
      { id: 'mock_biz_2', name: 'LeadsMind Retail Business' }
    ];
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/me/businesses?access_token=${oauth.token}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch businesses');
    }
    const list = data.data || [];
    return [
      { id: 'personal', name: 'Personal Profile (No Business)' },
      ...list
    ];
  } catch (err: any) {
    logger.error({ err }, 'messaging.meta_api.businesses.fetch.failed');
    return [{ id: 'personal', name: 'Personal Profile (No Business)' }];
  }
}

export async function fetchMetaPages(businessId: string) {
  const oauth = await loadMetaOauthSession();
  if (!oauth) throw new Error('Meta account not linked or session expired');

  if (oauth.isMock) {
    if (businessId === 'mock_biz_1') {
      return [
        { id: 'mock_page_1', name: 'LeadsMind Main Page', access_token: 'mock_fb_page_token_1' },
        { id: 'mock_page_2', name: 'LeadsMind Support Page', access_token: 'mock_fb_page_token_2' }
      ];
    } else if (businessId === 'mock_biz_2') {
      return [
        { id: 'mock_page_3', name: 'LeadsMind Retail Page', access_token: 'mock_fb_page_token_3' }
      ];
    } else {
      return [
        { id: 'mock_page_4', name: 'Personal Blog Page', access_token: 'mock_fb_page_token_4' }
      ];
    }
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${oauth.token}&limit=100`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch Facebook pages');
    }
    const list = data.data || [];
    return list.map((p: any) => ({
      id: p.id,
      name: p.name,
      access_token: p.access_token
    }));
  } catch (err: any) {
    logger.error({ err, businessId }, 'messaging.meta_api.pages.fetch.failed');
    throw err;
  }
}

export async function fetchMetaInstagramAccounts(pageId: string, pageAccessToken: string) {
  const oauth = await loadMetaOauthSession();
  if (!oauth) throw new Error('Meta account not linked or session expired');

  if (oauth.isMock) {
    const mockAccounts: Record<string, { id: string, username: string }[]> = {
      'mock_page_1': [{ id: 'mock_ig_1', username: 'leadsmind_main' }],
      'mock_page_2': [{ id: 'mock_ig_2', username: 'leadsmind_support' }],
      'mock_page_3': [{ id: 'mock_ig_3', username: 'leadsmind_retail' }]
    };
    return mockAccounts[pageId] || [{ id: 'mock_ig_4', username: 'personal_blog_ig' }];
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch Instagram account details');
    }
    
    const igId = data.instagram_business_account?.id;
    if (!igId) return [];

    const usernameRes = await fetch(`https://graph.facebook.com/v18.0/${igId}?fields=username&access_token=${pageAccessToken}`);
    const usernameData = await usernameRes.json();
    const username = usernameData.username || 'Instagram Business Account';

    return [{ id: igId, username }];
  } catch (err: any) {
    logger.error({ err, pageId }, 'messaging.meta_api.instagram_accounts.fetch.failed');
    return [];
  }
}

export async function fetchMetaWhatsAppAccounts(businessId: string) {
  const oauth = await loadMetaOauthSession();
  if (!oauth) throw new Error('Meta account not linked or session expired');

  if (oauth.isMock) {
    if (businessId === 'mock_biz_1') {
      return [{ id: 'mock_waba_1', name: 'LeadsMind Corporate WhatsApp' }];
    } else if (businessId === 'mock_biz_2') {
      return [{ id: 'mock_waba_2', name: 'LeadsMind Retail WhatsApp' }];
    } else {
      return [{ id: 'mock_waba_3', name: 'Personal Profile WABA' }];
    }
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/me/whatsapp_business_accounts?access_token=${oauth.token}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch WhatsApp Business Accounts');
    }
    return (data.data || []).map((w: any) => ({
      id: w.id,
      name: w.name
    }));
  } catch (err: any) {
    logger.error({ err, businessId }, 'messaging.meta_api.whatsapp_accounts.fetch.failed');
    return [];
  }
}

export async function fetchWhatsAppPhoneNumbers(wabaId: string) {
  const oauth = await loadMetaOauthSession();
  if (!oauth) throw new Error('Meta account not linked or session expired');

  if (oauth.isMock) {
    const mockHealthy = { code_verification_status: 'VERIFIED', status: 'CONNECTED', platform_type: 'CLOUD_API', cloudApiReady: true };
    if (wabaId === 'mock_waba_1') {
      return [{ id: 'mock_phone_1', display_phone_number: '+1 (555) 019-2834', verified_name: 'LeadsMind Corporate WhatsApp Line', ...mockHealthy }];
    } else if (wabaId === 'mock_waba_2') {
      return [{ id: 'mock_phone_2', display_phone_number: '+1 (555) 019-9999', verified_name: 'LeadsMind Retail WhatsApp Line', ...mockHealthy }];
    } else {
      return [{ id: 'mock_phone_3', display_phone_number: '+1 (555) 019-1111', verified_name: 'Personal WhatsApp Line', ...mockHealthy }];
    }
  }

  try {
    const fields = 'id,display_phone_number,verified_name,code_verification_status,status,platform_type';
    const response = await fetch(`https://graph.facebook.com/v18.0/${wabaId}/phone_numbers?fields=${fields}&access_token=${oauth.token}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch WhatsApp Phone Numbers');
    }
    return (data.data || []).map((p: any) => ({
      id: p.id,
      display_phone_number: p.display_phone_number,
      verified_name: p.verified_name || 'WhatsApp Business Line',
      code_verification_status: p.code_verification_status || null,
      status: p.status || null,
      platform_type: p.platform_type || null,
      // Surfaced in the picker so a customer sees this BEFORE selecting a number, not after a
      // silent "Connected" that never receives anything.
      cloudApiReady: isCloudApiHealthy(p.platform_type, p.status),
    }));
  } catch (err: any) {
    logger.error({ err, wabaId }, 'messaging.meta_api.whatsapp_phone_numbers.fetch.failed');
    return [];
  }
}

export async function saveMetaConnections(data: {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  instagramBusinessAccountId?: string | null;
  instagramUsername?: string | null;
  whatsappBusinessAccountId?: string | null;
  whatsappBusinessName?: string | null;
  phoneNumberId?: string | null;
  whatsappPhoneNumber?: string | null;
}, targetPlatform?: 'facebook' | 'instagram' | 'whatsapp' | null) {
  let workspaceId: string | null = null;
  try {
    workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const oauth = await loadMetaOauthSession();
    if (!oauth) return { error: 'OAuth session not found. Please reconnect.' };
    if (!isMetaMockMode() && hasMockCredential(data)) return { error: MOCK_CREDENTIALS_REJECTED };

    const supabase = await createServerClient();

    // 1. Validate Facebook Page access before persisting
    if ((targetPlatform === 'facebook' || !targetPlatform) && !oauth.isMock) {
      try {
        const pageRes = await fetch(`https://graph.facebook.com/v18.0/${data.pageId}?fields=name&access_token=${data.pageAccessToken}`);
        if (!pageRes.ok) {
          const errData = await pageRes.json();
          throw new Error(errData.error?.message || 'Invalid Facebook Page access');
        }
      } catch (err: any) {
        logger.error({ err, workspaceId, pageId: data.pageId }, 'messaging.meta_connections.page_validation.failed');
        return { error: 'Facebook Page validation failed. Please check your credentials.' };
      }
    }



    // Persist connections!
    let warning: string | undefined;
    if (targetPlatform === 'facebook') {
      const { error: fbErr } = await supabase.from('platform_connections').upsert({
        workspace_id: workspaceId,
        platform: 'facebook',
        credentials: {
          page_id: data.pageId,
          page_name: data.pageName,
          page_access_token_encrypted: encrypt(data.pageAccessToken),
          user_access_token_encrypted: encrypt(oauth.token),
          health_status: 'connected'
        },
        status: 'connected',
        last_sync_at: new Date().toISOString()
      }, { onConflict: 'workspace_id,platform' });
      if (fbErr) throw fbErr;
    } else if (targetPlatform === 'instagram') {
      // Instagram publishing rides on the same Page's access token, so the Page picked in
      // this wizard must also become the Facebook connection's Page — otherwise the two
      // connections can silently point at different Pages.
      const { error: fbErr } = await supabase.from('platform_connections').upsert({
        workspace_id: workspaceId,
        platform: 'facebook',
        credentials: {
          page_id: data.pageId,
          page_name: data.pageName,
          page_access_token_encrypted: encrypt(data.pageAccessToken),
          user_access_token_encrypted: encrypt(oauth.token),
          health_status: 'connected'
        },
        status: 'connected',
        last_sync_at: new Date().toISOString()
      }, { onConflict: 'workspace_id,platform' });
      if (fbErr) throw fbErr;

      const { error: igErr } = await supabase.from('platform_connections').upsert({
        workspace_id: workspaceId,
        platform: 'instagram',
        credentials: {
          instagram_id: data.instagramBusinessAccountId,
          instagram_username: data.instagramUsername || 'IG Account',
          page_id: data.pageId,
          page_name: data.pageName,
          page_access_token_encrypted: encrypt(data.pageAccessToken),
          health_status: 'connected'
        },
        status: 'connected',
        last_sync_at: new Date().toISOString()
      }, { onConflict: 'workspace_id,platform' });
      if (igErr) throw igErr;
    } else if (targetPlatform === 'whatsapp') {
      // Fail closed: a number that isn't actually CLOUD_API/CONNECTED on Meta's side will never
      // receive real WhatsApp traffic no matter what we store here (confirmed live against a real
      // number this exact scenario broke for). The webhook-subscription check below is necessary
      // but not sufficient - it passes even for a number stuck ON_PREMISE/DISCONNECTED, which is
      // exactly how this went silently wrong before. This is checked with a fresh, real Graph API
      // call rather than trusting whatever fetchWhatsAppPhoneNumbers() returned to the picker
      // (which could be stale by the time the customer clicks through the wizard).
      if (!data.phoneNumberId) return { error: 'No WhatsApp phone number selected.' };
      if (!oauth.isMock) {
        const fields = 'id,status,platform_type,code_verification_status';
        const pnRes = await fetch(`https://graph.facebook.com/v18.0/${data.phoneNumberId}?fields=${fields}&access_token=${oauth.token}`);
        const pnData = await pnRes.json();
        if (!pnRes.ok) {
          logger.error({ err: pnData?.error, phoneNumberId: data.phoneNumberId, workspaceId }, 'messaging.whatsapp.phone_status_check.failed');
          return { error: pnData?.error?.message || 'Could not verify this WhatsApp number\'s status with Meta. Please try again.' };
        }
        if (!isCloudApiHealthy(pnData.platform_type, pnData.status)) {
          logger.warn({ phoneNumberId: data.phoneNumberId, workspaceId, platformType: pnData.platform_type, status: pnData.status }, 'messaging.whatsapp.connect_refused_unhealthy_number');
          return {
            error: `This WhatsApp number isn't ready to receive messages yet (Cloud API status: ${pnData.status || 'unknown'}${pnData.platform_type && pnData.platform_type !== 'CLOUD_API' ? `, platform: ${pnData.platform_type}` : ''}). ` +
              'It needs to complete Cloud API registration in Meta\'s WhatsApp Manager (business.facebook.com/wa/manage/phone-numbers) before it can be connected here.',
          };
        }
      }

      const wa = await whatsappWebhookHealth(data.whatsappBusinessAccountId, oauth.token);
      if (!wa.ok) warning = WA_WEBHOOK_WARNING;
      const { error: waErr } = await supabase.from('platform_connections').upsert({
        workspace_id: workspaceId,
        platform: 'whatsapp',
        credentials: {
          phone_number_id: data.phoneNumberId,
          waba_id: data.whatsappBusinessAccountId,
          waba_name: data.whatsappBusinessName || 'WhatsApp Business Line',
          phone_number: data.whatsappPhoneNumber || 'WhatsApp Number',
          system_user_access_token_encrypted: encrypt(oauth.token),
          ...wa.credentials
        },
        status: wa.status,
        last_sync_at: new Date().toISOString()
      }, { onConflict: 'workspace_id,platform' });
      if (waErr) throw waErr;
    } else {
      // Legacy behavior (all-in-one setup)
      // A. Facebook Connection
      const { error: fbErr } = await supabase.from('platform_connections').upsert({
        workspace_id: workspaceId,
        platform: 'facebook',
        credentials: {
          page_id: data.pageId,
          page_name: data.pageName,
          page_access_token_encrypted: encrypt(data.pageAccessToken),
          user_access_token_encrypted: encrypt(oauth.token),
          health_status: 'connected'
        },
        status: 'connected',
        last_sync_at: new Date().toISOString()
      }, { onConflict: 'workspace_id,platform' });
      if (fbErr) throw fbErr;

      // B. Instagram Connection
      if (data.instagramBusinessAccountId) {
        const { error: igErr } = await supabase.from('platform_connections').upsert({
          workspace_id: workspaceId,
          platform: 'instagram',
          credentials: {
            instagram_id: data.instagramBusinessAccountId,
            instagram_username: data.instagramUsername || 'IG Account',
            page_id: data.pageId,
            page_access_token_encrypted: encrypt(data.pageAccessToken),
            health_status: 'connected'
          },
          status: 'connected',
          last_sync_at: new Date().toISOString()
        }, { onConflict: 'workspace_id,platform' });
        if (igErr) throw igErr;
      } else {
        await supabase.from('platform_connections').delete().eq('workspace_id', workspaceId).eq('platform', 'instagram');
      }

      // C. WhatsApp Connection
      if (data.phoneNumberId && data.whatsappBusinessAccountId) {
        const wa = await whatsappWebhookHealth(data.whatsappBusinessAccountId, oauth.token);
        if (!wa.ok) warning = WA_WEBHOOK_WARNING;
        const { error: waErr } = await supabase.from('platform_connections').upsert({
          workspace_id: workspaceId,
          platform: 'whatsapp',
          credentials: {
            phone_number_id: data.phoneNumberId,
            waba_id: data.whatsappBusinessAccountId,
            waba_name: data.whatsappBusinessName || 'WhatsApp Business Line',
            phone_number: data.whatsappPhoneNumber || 'WhatsApp Number',
            system_user_access_token_encrypted: encrypt(oauth.token),
            ...wa.credentials
          },
          status: wa.status,
          last_sync_at: new Date().toISOString()
        }, { onConflict: 'workspace_id,platform' });
        if (waErr) throw waErr;
      } else {
        await supabase.from('platform_connections').delete().eq('workspace_id', workspaceId).eq('platform', 'whatsapp');
      }
    }

    return { success: true, warning };
  } catch (error: any) {
    logger.error({ err: error, workspaceId }, 'messaging.meta_connections.save.failed');
    return { error: 'Failed to save Meta connections' };
  }
}
