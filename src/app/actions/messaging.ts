'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { MetaAdapter } from '@/lib/meta/MetaAdapter';
import { encrypt } from '@/lib/encryption';

const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback` : 'http://localhost:3000/api/auth/callback';

export async function getMetaAuthUrl() {
	const workspaceId = await getCurrentWorkspaceId();
	const appId = process.env.META_APP_ID;
	const redirectBase = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
	const metaRedirectUri = `${redirectBase}/api/auth/meta/callback`;

	if (!appId || appId === 'placeholder') {
		return `${metaRedirectUri}?code=mock_code&state=${workspaceId}`;
	}

	const scope = 'pages_messaging,pages_manage_metadata,instagram_manage_messages,whatsapp_business_management,whatsapp_business_messaging';
	return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(metaRedirectUri)}&scope=${scope}&response_type=code&state=${workspaceId}`;
}

export async function connectPlatformManually(platform: string, data: any) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    let credentials: any = {};

    if (platform === 'facebook') {
      credentials = {
        page_id: data.pageId,
        page_name: data.pageName || 'LeadsMind Page',
        page_access_token_encrypted: encrypt(data.pageAccessToken),
        user_access_token_encrypted: encrypt(data.userAccessToken || data.pageAccessToken)
      };
    } else if (platform === 'instagram') {
      credentials = {
        instagram_business_account_id: data.instagramBusinessAccountId,
        page_id: data.pageId,
        page_access_token_encrypted: encrypt(data.pageAccessToken)
      };
    } else if (platform === 'whatsapp') {
      credentials = {
        phone_number_id: data.phoneNumberId,
        whatsapp_business_account_id: data.whatsappBusinessAccountId,
        system_user_access_token_encrypted: encrypt(data.systemUserAccessToken)
      };
    } else {
      return { error: 'Invalid platform' };
    }

    const { error } = await supabase.from('platform_connections').upsert({
      workspace_id: workspaceId,
      platform,
      credentials,
      status: 'connected',
      last_sync_at: new Date().toISOString()
    }, { onConflict: 'workspace_id,platform' });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to save connection' };
  }
}

export async function getLinkedInAuthUrl() {
 const clientId = process.env.LINKEDIN_CLIENT_ID;
 const scope = 'w_member_social,r_liteprofile';
 return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${REDIRECT_URI}&scope=${scope}`;
}

export async function getTikTokAuthUrl() {
 const clientKey = process.env.TIKTOK_CLIENT_KEY;
 const scope = 'user.info.basic,video.list,video.publish';
 return `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${scope}&response_type=code&redirect_uri=${REDIRECT_URI}`;
}

export async function getConnectedPlatforms() {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return [];

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('platform_connections')
   .select('platform, status, last_sync_at, credentials')
   .eq('workspace_id', workspaceId);

  if (error) throw error;
  return data || [];
 } catch (error) {
  console.error('[messaging] Error fetching platforms:', error);
  return [];
 }
}

export async function disconnectPlatform(platform: string) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
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
  return { error: error.message || 'Failed to disconnect platform' };
 }
}


async function resolveConversationIds(conversationId: string): Promise<string[]> {
  if (!conversationId.startsWith('contact:')) {
    return [conversationId];
  }
  const contactId = conversationId.split(':')[1];
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('conversations')
    .select('id')
    .eq('contact_id', contactId);
  return data?.map(c => c.id) || [];
}

export async function getConversations() {
 try {
  const workspaceId = await getCurrentWorkspaceId();
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
    messages (content, direction, sent_at, status, metadata, sender_handle)
   `)
   .eq('workspace_id', workspaceId)
   .order('last_message_at', { ascending: false });

  // Filter messages to just get the latest one per conversation if needed
  
  if (error) throw error;
  return { data };
 } catch (error: any) {
  return { error: error.message || 'Failed to fetch conversations' };
 }
}

export async function sendMessage(conversationId: string, content: string) {
  const ids = await resolveConversationIds(conversationId);
  const targetConvId = ids[0] || conversationId;

 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data: msgData, error } = await supabase
   .from('messages')
   .insert({
    workspace_id: workspaceId,
    conversation_id: targetConvId,
    direction: 'outbound',
    content,
    status: 'sending'
   })
   .select()
   .single();

  if (error) throw error;
  
  // Update conversation last_message_at
  await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).in('id', ids);

  // If it's an email platform, send the actual email via Resend
  const { data: conv } = await supabase
   .from('conversations')
   .select('platform, external_thread_id, contacts(email, phone)')
   .eq('id', targetConvId)
   .single();

  let messageFailed = false;
  let errorMessage = '';

  if (conv?.platform === 'email') {
   const contact = Array.isArray(conv.contacts) ? conv.contacts[0] : conv.contacts;
   if (contact?.email) {
    try {
     await sendEmail({
      to: contact.email,
      subject: 'New message from LeadsMind Support',
      text: content,
     });
     await supabase.from('messages').update({ status: 'delivered' }).eq('id', msgData.id);
    } catch (emailErr: any) {
     console.error('[messaging] Failed to send actual email:', emailErr);
     messageFailed = true;
     errorMessage = emailErr.message || 'Failed to send email';
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
     
     await supabase.from('messages').update({ status: 'delivered' }).eq('id', msgData.id);
    } catch (bridgeErr: any) {
     console.error('[messaging] Failed to send to SMS Bridge:', bridgeErr);
     messageFailed = true;
     errorMessage = bridgeErr.message || 'Failed to route via SMS Bridge';
    }
   } else {
     messageFailed = true;
     errorMessage = 'No phone number for contact';
   }
  } else if (conv?.platform === 'facebook') {
   // Fetch Facebook Credentials
   const { data: conn } = await supabase
    .from('platform_connections')
    .select('credentials')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'facebook')
    .maybeSingle();

   if (conn?.credentials) {
    const creds = conn.credentials as any;
    const res = await MetaAdapter.sendFacebook(
     creds.page_id,
     creds.page_access_token_encrypted,
     conv.external_thread_id || '',
     content
    );
    if (res.success) {
     await supabase.from('messages').update({ status: 'delivered', external_id: res.externalId }).eq('id', msgData.id);
    } else {
     messageFailed = true;
     errorMessage = res.error || 'Failed to dispatch via MetaAdapter';
    }
   } else {
    messageFailed = true;
    errorMessage = 'Facebook page connection not configured';
   }
  } else if (conv?.platform === 'instagram') {
   // Fetch Instagram Credentials
   const { data: conn } = await supabase
    .from('platform_connections')
    .select('credentials')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'instagram')
    .maybeSingle();

   if (conn?.credentials) {
    const creds = conn.credentials as any;
    const res = await MetaAdapter.sendInstagram(
     creds.instagram_business_account_id,
     creds.page_access_token_encrypted,
     conv.external_thread_id || '',
     content
    );
    if (res.success) {
     await supabase.from('messages').update({ status: 'delivered', external_id: res.externalId }).eq('id', msgData.id);
    } else {
     messageFailed = true;
     errorMessage = res.error || 'Failed to dispatch via MetaAdapter';
    }
   } else {
    messageFailed = true;
    errorMessage = 'Instagram connection not configured';
   }
  } else if (conv?.platform === 'whatsapp') {
   // Fetch WhatsApp Credentials
   const { data: conn } = await supabase
    .from('platform_connections')
    .select('credentials')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'whatsapp')
    .maybeSingle();

   if (conn?.credentials) {
    const creds = conn.credentials as any;
    const res = await MetaAdapter.sendWhatsApp(
     creds.phone_number_id,
     creds.system_user_access_token_encrypted,
     conv.external_thread_id || '',
     content
    );
    if (res.success) {
     await supabase.from('messages').update({ status: 'delivered', external_id: res.externalId }).eq('id', msgData.id);
    } else {
     messageFailed = true;
     errorMessage = res.error || 'Failed to dispatch via MetaAdapter';
    }
   } else {
    messageFailed = true;
    errorMessage = 'WhatsApp connection not configured';
   }
  } else {
    // Just mark as sent for other platforms for now
    await supabase.from('messages').update({ status: 'delivered' }).eq('id', msgData.id);
  }

  if (messageFailed && msgData) {
    await supabase.from('messages').update({ status: 'failed', metadata: { error_message: errorMessage } }).eq('id', msgData.id);
  }

  return { success: true };
 } catch (error: any) {
  return { error: error.message || 'Failed to send message' };
 }
}

export async function sendInternalNote(conversationId: string, content: string, senderHandle = 'Agent') {
  const ids = await resolveConversationIds(conversationId);
  const targetConvId = ids[0] || conversationId;
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

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
  await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).in('id', ids);

  return { success: true, data: msgData };
 } catch (error: any) {
  return { error: error.message || 'Failed to save note' };
 }
}

export async function updateConversationAssignment(conversationId: string, assignedTo: string | null) {
  const ids = await resolveConversationIds(conversationId);
  if (ids.length === 0) return { error: 'No conversations found' };
 try {
  const supabase = await createServerClient();
  const { error } = await supabase
   .from('conversations')
   .update({ assigned_to: assignedTo })
   .in('id', ids);

  if (error) throw error;
  return { success: true };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function updateConversationStatus(conversationId: string, status: string) {
  const ids = await resolveConversationIds(conversationId);
  if (ids.length === 0) return { error: 'No conversations found' };
 try {
  const supabase = await createServerClient();
  const { error } = await supabase
   .from('conversations')
   .update({ status })
   .in('id', ids);

  if (error) throw error;
  return { success: true };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function updateConversationTags(conversationId: string, tags: string[]) {
  const ids = await resolveConversationIds(conversationId);
  if (ids.length === 0) return { error: 'No conversations found' };
 try {
  const supabase = await createServerClient();
  const { error } = await supabase
   .from('conversations')
   .update({ tags })
   .in('id', ids);

  if (error) throw error;
  return { success: true };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function getQuickReplies() {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('quick_replies')
   .select('*')
   .eq('workspace_id', workspaceId)
   .order('shortcut', { ascending: true });

  if (error) throw error;
  return { data };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function createQuickReply(shortcut: string, message: string) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

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
  return { error: error.message };
 }
}

export async function deleteQuickReply(id: string) {
 try {
  const supabase = await createServerClient();
  const { error } = await supabase
   .from('quick_replies')
   .delete()
   .eq('id', id);

  if (error) throw error;
  return { success: true };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function updateContactConsent(contactId: string, optedIn: boolean, optedOut: boolean) {
 try {
  const supabase = await createServerClient();
  const { error } = await supabase
   .from('contacts')
   .update({
     opted_in: optedIn,
     opted_out: optedOut,
     opt_out_date: optedOut ? new Date().toISOString() : null
   })
   .eq('id', contactId);

  if (error) throw error;
  return { success: true };
 } catch (error: any) {
  return { error: error.message };
 }
}
