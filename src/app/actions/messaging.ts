'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { MetaAdapter } from '@/lib/meta/MetaAdapter';
import { encrypt, decrypt } from '@/lib/encryption';

const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback` : 'http://localhost:3000/api/auth/callback';

export async function getMetaAuthUrl() {
	const workspaceId = await getCurrentWorkspaceId();
	const appId = process.env.META_APP_ID;
	const redirectBase = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
	const metaRedirectUri = `${redirectBase}/api/auth/meta/callback`;

	if (!appId || appId === 'placeholder' || !process.env.META_APP_ID) {
		return `${metaRedirectUri}?code=mock_code&state=${workspaceId}`;
	}

	const scope = 'pages_messaging,pages_manage_metadata,instagram_manage_messages,whatsapp_business_management,whatsapp_business_messaging';
	return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(metaRedirectUri)}&scope=${scope}&response_type=code&state=${workspaceId}`;
}

async function validateMetaPlatformCredentials(platform: string, data: any) {
  const token = platform === 'whatsapp' ? data.systemUserAccessToken : data.pageAccessToken;
  const id = platform === 'facebook' ? data.pageId : 
             platform === 'instagram' ? data.instagramBusinessAccountId : 
             data.phoneNumberId;

  if (!token || !id) {
    throw new Error('Required configuration fields are missing.');
  }

  // If it's a mock token or mock ID, skip validation and return mock values
  if (token.startsWith('mock_') || id.startsWith('mock_')) {
    console.log(`[Validation] Skipping validation for mock connection on ${platform}`);
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
    throw new Error(`Meta API Validation Failed: ${err.message}`);
  }
}

export async function connectPlatformManually(platform: string, data: any) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    // 1. Validate credentials against Meta Graph API
    const validation = await validateMetaPlatformCredentials(platform, data);

    const supabase = await createServerClient();
    let credentials: any = {};

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
        instagram_business_account_id: data.instagramBusinessAccountId,
        instagram_username: validation.name || 'IG Account',
        page_id: data.pageId,
        page_access_token_encrypted: encrypt(data.pageAccessToken),
        health_status: 'connected'
      };
    } else if (platform === 'whatsapp') {
      credentials = {
        phone_number_id: data.phoneNumberId,
        whatsapp_business_account_id: data.whatsappBusinessAccountId,
        whatsapp_business_name: validation.name || 'WhatsApp Business Line',
        whatsapp_phone_number: validation.extra || 'WhatsApp Number',
        system_user_access_token_encrypted: encrypt(data.systemUserAccessToken),
        health_status: 'connected'
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

export async function getMetaOauthToken() {
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
    if (!creds || (!creds.user_access_token_encrypted && !creds.is_mock)) {
      return null;
    }

    const isMock = !!creds.is_mock;
    const token = creds.user_access_token_encrypted ? decrypt(creds.user_access_token_encrypted) : '';

    return {
      token,
      isMock,
      status: data.status
    };
  } catch (err) {
    console.error('[messaging actions] getMetaOauthToken error:', err);
    return null;
  }
}

export async function fetchMetaBusinesses() {
  const oauth = await getMetaOauthToken();
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
    console.error('[Meta API] Error fetching businesses:', err);
    return [{ id: 'personal', name: 'Personal Profile (No Business)' }];
  }
}

export async function fetchMetaPages(businessId: string) {
  const oauth = await getMetaOauthToken();
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
    console.error('[Meta API] Error fetching pages:', err);
    throw err;
  }
}

export async function fetchMetaInstagramAccounts(pageId: string, pageAccessToken: string) {
  const oauth = await getMetaOauthToken();
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
    console.error('[Meta API] Error fetching Instagram accounts:', err);
    return [];
  }
}

export async function fetchMetaWhatsAppAccounts(businessId: string) {
  const oauth = await getMetaOauthToken();
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
    console.error('[Meta API] Error fetching WhatsApp Business Accounts:', err);
    return [];
  }
}

export async function fetchWhatsAppPhoneNumbers(wabaId: string) {
  const oauth = await getMetaOauthToken();
  if (!oauth) throw new Error('Meta account not linked or session expired');

  if (oauth.isMock) {
    if (wabaId === 'mock_waba_1') {
      return [{ id: 'mock_phone_1', display_phone_number: '+1 (555) 019-2834', verified_name: 'LeadsMind Corporate WhatsApp Line' }];
    } else if (wabaId === 'mock_waba_2') {
      return [{ id: 'mock_phone_2', display_phone_number: '+1 (555) 019-9999', verified_name: 'LeadsMind Retail WhatsApp Line' }];
    } else {
      return [{ id: 'mock_phone_3', display_phone_number: '+1 (555) 019-1111', verified_name: 'Personal WhatsApp Line' }];
    }
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${wabaId}/phone_numbers?access_token=${oauth.token}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch WhatsApp Phone Numbers');
    }
    return (data.data || []).map((p: any) => ({
      id: p.id,
      display_phone_number: p.display_phone_number,
      verified_name: p.verified_name || 'WhatsApp Business Line'
    }));
  } catch (err: any) {
    console.error('[Meta API] Error fetching WhatsApp Phone Numbers:', err);
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
}) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const oauth = await getMetaOauthToken();
    if (!oauth) return { error: 'OAuth session not found. Please reconnect.' };

    const supabase = await createServerClient();

    // 1. Validate Facebook Page access before persisting
    if (!oauth.isMock) {
      try {
        const pageRes = await fetch(`https://graph.facebook.com/v18.0/${data.pageId}?fields=name&access_token=${data.pageAccessToken}`);
        if (!pageRes.ok) {
          const errData = await pageRes.json();
          throw new Error(errData.error?.message || 'Invalid Facebook Page access');
        }
      } catch (err: any) {
        return { error: `Facebook Page Validation Failed: ${err.message}` };
      }
    }

    // 2. Validate Instagram access (if selected) before persisting
    if (data.instagramBusinessAccountId && !oauth.isMock) {
      try {
        const igRes = await fetch(`https://graph.facebook.com/v18.0/${data.instagramBusinessAccountId}?fields=username&access_token=${data.pageAccessToken}`);
        if (!igRes.ok) {
          const errData = await igRes.json();
          throw new Error(errData.error?.message || 'Invalid Instagram account access');
        }
      } catch (err: any) {
        return { error: `Instagram Validation Failed: ${err.message}` };
      }
    }

    // 3. Validate WhatsApp access (if selected) before persisting
    if (data.phoneNumberId && !oauth.isMock) {
      try {
        const waRes = await fetch(`https://graph.facebook.com/v18.0/${data.phoneNumberId}?fields=verified_name,display_phone_number&access_token=${oauth.token}`);
        if (!waRes.ok) {
          const errData = await waRes.json();
          throw new Error(errData.error?.message || 'Invalid WhatsApp Phone Number access');
        }
      } catch (err: any) {
        return { error: `WhatsApp Validation Failed: ${err.message}` };
      }
    }

    // Persist connections!
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
          instagram_business_account_id: data.instagramBusinessAccountId,
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
      const { error: waErr } = await supabase.from('platform_connections').upsert({
        workspace_id: workspaceId,
        platform: 'whatsapp',
        credentials: {
          phone_number_id: data.phoneNumberId,
          whatsapp_business_account_id: data.whatsappBusinessAccountId,
          whatsapp_business_name: data.whatsappBusinessName || 'WhatsApp Business Line',
          whatsapp_phone_number: data.whatsappPhoneNumber || 'WhatsApp Number',
          system_user_access_token_encrypted: encrypt(oauth.token),
          health_status: 'connected'
        },
        status: 'connected',
        last_sync_at: new Date().toISOString()
      }, { onConflict: 'workspace_id,platform' });
      if (waErr) throw waErr;
    } else {
      await supabase.from('platform_connections').delete().eq('workspace_id', workspaceId).eq('platform', 'whatsapp');
    }

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to save Meta connections' };
  }
}
