'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { MetaAdapter } from '@/lib/meta/MetaAdapter';
import { encrypt, decrypt } from '@/lib/encryption';
import { getWorkspaceEmailConfig } from '@/lib/email/resolveConfig';
import { EmailAutomationService } from '@/lib/automations/EmailAutomationService';
import { UnifiedActivityEngine } from '@/lib/crm/UnifiedActivityEngine';

const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback` : 'http://localhost:3000/api/auth/callback';

export async function getMetaAuthUrl(targetPlatform?: string) {
	const workspaceId = await getCurrentWorkspaceId();
	const appId = process.env.META_APP_ID;
	const redirectBase = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
	const metaRedirectUri = `${redirectBase}/api/auth/meta/callback`;
	const stateStr = targetPlatform ? `${workspaceId}:${targetPlatform}` : `${workspaceId}`;

	if (!appId || appId === 'placeholder' || !process.env.META_APP_ID) {
		return `${metaRedirectUri}?code=mock_code&state=${stateStr}`;
	}

	const scope = 'pages_show_list,pages_messaging,pages_manage_metadata,pages_read_engagement,pages_manage_posts,instagram_manage_messages,instagram_content_publishing,whatsapp_business_messaging,whatsapp_business_management,business_management';
	const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(metaRedirectUri)}&scope=${scope}&response_type=code&state=${stateStr}`;
	console.log('[Meta OAuth Scope]', scope);
	console.log('[Meta OAuth URL]', url);
	return url;
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
        instagram_id: data.instagramBusinessAccountId,
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

export async function sendMessage(conversationId: string, content: string, audioUrl?: string, transcript?: string) {
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
    audio_url: audioUrl || null,
    status: 'sending',
    metadata: {
      transcript: transcript || null,
      audio_url: audioUrl || null
    }
   })
   .select()
   .single();

  if (error) throw error;
  
  // Update conversation last_message_at
  await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).in('id', ids);

  // If it's an email platform, send the actual email via Resend
  const { data: conv } = await supabase
   .from('conversations')
   .select('platform, external_thread_id, contacts(id, email, phone, first_name)')
   .eq('id', targetConvId)
   .single();

  let messageFailed = false;
  let errorMessage = '';

  if (conv?.platform === 'email') {
   const contact = Array.isArray(conv.contacts) ? conv.contacts[0] : conv.contacts;
   if (contact?.email) {
    try {
     if (audioUrl) {
       // Voice note email!
       // Fetch user, workspace, and branding configs
       const { data: { user: currentUser } } = await supabase.auth.getUser();
       const { data: sender } = await supabase
         .from('users')
         .select('first_name, last_name, profile_photo_url, job_title, identity_color')
         .eq('id', currentUser?.id)
         .maybeSingle();

       const { data: ws } = await supabase
         .from('workspaces')
         .select('resend_api_key, email_from_name, email_from_address, name')
         .eq('id', workspaceId)
         .maybeSingle();

       const { data: branding } = await supabase
         .from('workspace_branding')
         .select('logo_url, primary_color')
         .eq('workspace_id', workspaceId)
         .maybeSingle();

       const providerConfig = await getWorkspaceEmailConfig(workspaceId);
       const apiKey = providerConfig?.apiKey || ws?.resend_api_key || process.env.RESEND_API_KEY;
       const fromName = providerConfig?.fromName || ws?.email_from_name || 'LeadsMind';
       const fromEmail = providerConfig?.fromEmail || ws?.email_from_address || 'onboarding@resend.dev';

       const senderFullName = `${sender?.first_name || ''} ${sender?.last_name || ''}`.trim() || 'Team Member';
       const senderPhotoUrl = sender?.profile_photo_url || '';
       const senderJobTitle = sender?.job_title || 'Workspace Member';
       const workspaceName = ws?.name || 'LeadsMind Workspace';
       const workspaceLogoUrl = branding?.logo_url || 'https://leadsmind.io/logo-white.png';
       const workspaceColor = branding?.primary_color || '#5C4AC7';

       const initials = senderFullName
         .split(' ')
         .map((n: string) => n[0])
         .join('')
         .slice(0, 2)
         .toUpperCase() || 'TM';

       const avatarHtml = senderPhotoUrl
         ? `<img src="${senderPhotoUrl}" alt="${senderFullName}" width="56" height="56" style="border: 0; outline: none; display: block; border-radius: 28px; width: 56px; height: 56px; object-fit: cover;" />`
         : `<div style="width: 56px; height: 56px; border-radius: 28px; background-color: ${workspaceColor}; color: #ffffff; text-align: center; line-height: 56px; font-size: 20px; font-weight: bold; font-family: Arial, sans-serif;">${initials}</div>`;

       const htmlContent = `
         <!DOCTYPE html>
         <html>
         <head>
           <meta charset="utf-8">
           <title>Voice Note from ${senderFullName}</title>
         </head>
         <body style="font-family: Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px 0;">
           <table cellpadding="0" cellspacing="0" border="0" width="100%">
             <tr>
               <td align="center">
                 <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                   
                   <!-- Header Band -->
                   <tr>
                     <td style="background-color: ${workspaceColor}; padding: 16px 24px; text-align: center; vertical-align: middle;">
                       <img src="${workspaceLogoUrl}" alt="Workspace Logo" height="28" style="border: 0; outline: none; display: block; margin: 0 auto; max-height: 28px;" />
                     </td>
                   </tr>

                   <!-- Content Area -->
                   <tr>
                     <td style="padding: 24px;">
                       
                       <h2 style="font-size: 18px; font-weight: bold; color: #1e293b; margin: 0 0 16px 0;">Voice Note Received</h2>

                       <!-- Identity Row -->
                       <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 24px 0;">
                         <tr>
                           <td width="56" valign="top" style="padding-right: 14px;">
                             ${avatarHtml}
                           </td>
                           <td valign="middle">
                             <div style="font-size: 17px; font-weight: bold; color: #1A1A1A; line-height: 1.2;">${senderFullName}</div>
                             <div style="font-size: 13px; color: #888888; margin-top: 3px;">${senderJobTitle} · ${workspaceName}</div>
                           </td>
                         </tr>
                       </table>

                       <p style="font-size: 14px; line-height: 1.6; color: #2D2D2D; margin: 0 0 12px 0;">
                         Hi ${contact?.first_name || 'there'},
                       </p>

                       ${content ? `<p style="font-size: 14px; line-height: 1.6; color: #2D2D2D; margin: 0 0 20px 0;">${content.replace(/\n/g, '<br>')}</p>` : ''}

                       <!-- Audio Block -->
                       <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F1EFE8; border-left: 4px solid ${workspaceColor}; border-radius: 12px; margin: 0 0 24px 0;">
                         <tr>
                           <td style="padding: 20px;">
                             <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: ${workspaceColor}; margin-bottom: 12px; letter-spacing: 0.05em;">Voice Note Attachment</div>
                             
                             <div style="margin: 20px 0; text-align: center;">
                               <a href="${audioUrl}" target="_blank" style="display: inline-block; width: 48px; height: 48px; line-height: 48px; background-color: ${workspaceColor}; border-radius: 24px; text-align: center; text-decoration: none; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
                                 <span style="color: #ffffff; font-size: 18px; margin-left: 4px; display: inline-block; vertical-align: middle; line-height: 48px;">▶</span>
                               </a>
                             </div>

                             <div style="font-size: 12px; color: #888888; text-align: center; margin-bottom: 16px; font-family: Arial, sans-serif;">
                               Tap the button above to listen in your browser
                             </div>

                             <div style="margin-bottom: 16px;">
                               <audio controls style="width: 100%; border-radius: 8px;">
                                 <source src="${audioUrl}" type="audio/mpeg" />
                                 Your browser does not support audio playback inline.
                               </audio>
                             </div>

                             <div style="text-align: left;">
                               <a href="${audioUrl}" download style="font-size: 13px; color: ${workspaceColor}; font-weight: bold; text-decoration: none; display: inline-block;">
                                 ⬇ Download Audio to listen offline
                               </a>
                             </div>
                           </td>
                         </tr>
                       </table>

                       <!-- Expandable Transcript Module -->
                       ${transcript ? `
                       <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 20px 0;">
                         <tr>
                           <td>
                             <details style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #FAFAFE; outline: none;">
                               <summary style="padding: 16px; font-size: 13px; font-weight: bold; color: ${workspaceColor}; cursor: pointer; user-select: none; outline: none;">
                                 ✨ View AI Audio Transcript
                               </summary>
                               <div style="padding: 16px; border-top: 1px solid #e2e8f0; font-size: 13.5px; line-height: 1.6; color: #475569; font-style: italic; background-color: #FAFAFE;">
                                 "${transcript}"
                               </div>
                             </details>
                           </td>
                         </tr>
                       </table>
                       ` : ''}

                     </td>
                   </tr>

                   <!-- Footer -->
                   <tr>
                     <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.5;">
                       Sent automatically by LeadsMind Voice Engine. Keep capturing premium high-intent leads.<br>
                       © ${new Date().getFullYear()} LeadsMind Inc. All rights reserved.
                     </td>
                   </tr>

                 </table>
               </td>
             </tr>
           </table>
         </body>
         </html>
       `;

       await sendEmail({
         to: contact.email,
         subject: 'Voice note from ' + senderFullName,
         html: htmlContent,
         config: {
           apiKey,
           fromEmail,
           fromName,
         },
       });
     } else {
       await sendEmail({
        to: contact.email,
        subject: 'New message from LeadsMind Support',
        text: content,
       });
     }
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
  } else if (['facebook', 'instagram', 'whatsapp'].includes(conv?.platform || '')) {
   const { data: conn } = await supabase
    .from('platform_connections')
    .select('credentials')
    .eq('workspace_id', workspaceId)
    .eq('platform', conv!.platform)
    .maybeSingle();

   if (conn?.credentials) {
    const adapter = new MetaAdapter(conn.credentials);
    let res;
    if (conv!.platform === 'facebook') {
      res = await adapter.sendFacebook(conv!.external_thread_id || '', content);
    } else if (conv!.platform === 'instagram') {
      res = await adapter.sendInstagram(conv!.external_thread_id || '', content);
    } else if (conv!.platform === 'whatsapp') {
      if (audioUrl) {
        // Fetch user and workspace settings for WhatsApp intro
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const { data: sender } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', currentUser?.id)
          .maybeSingle();
        const { data: ws } = await supabase
          .from('workspaces')
          .select('name')
          .eq('id', workspaceId)
          .maybeSingle();

        const senderName = `${sender?.first_name || ''} ${sender?.last_name || ''}`.trim() || 'Team Member';
        const workspaceName = ws?.name || 'LeadsMind';
        const introText = `Hi, this is ${senderName} from ${workspaceName}. I've sent you a voice note below 👇\n\n${content || ''}`.trim();
        
        res = await adapter.sendWhatsApp(conv!.external_thread_id || '', introText, audioUrl);
      } else {
        res = await adapter.sendWhatsApp(conv!.external_thread_id || '', content);
      }
    }

    if (res && res.success) {
      await supabase.from('messages').update({ status: 'sent', external_id: res.externalId }).eq('id', msgData.id);
    } else {
      messageFailed = true;
      errorMessage = res?.error || 'Failed to dispatch via MetaAdapter';
    }
   } else {
     messageFailed = true;
     errorMessage = `${conv?.platform} connection not configured`;
   }
  } else {
    // Just mark as sent for other platforms for now
    await supabase.from('messages').update({ status: 'delivered' }).eq('id', msgData.id);
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
        console.error('[messaging] Failed to log voice activity:', actErr);
      }
    }
  }

  if (messageFailed) {
    if (msgData) {
      await supabase.from('messages').update({ status: 'failed', metadata: { error_message: errorMessage } }).eq('id', msgData.id);
    }
    return { error: errorMessage };
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
}, targetPlatform?: 'facebook' | 'instagram' | 'whatsapp' | null) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const oauth = await getMetaOauthToken();
    if (!oauth) return { error: 'OAuth session not found. Please reconnect.' };

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
        return { error: `Facebook Page Validation Failed: ${err.message}` };
      }
    }



    // Persist connections!
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
    } else if (targetPlatform === 'whatsapp') {
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
    }

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to save Meta connections' };
  }
}
