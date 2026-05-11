'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback` : 'http://localhost:3000/api/auth/callback';

export async function getMetaAuthUrl() {
 const appId = process.env.META_APP_ID;
 const scope = 'pages_messaging,pages_manage_metadata,instagram_manage_messages';
 return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${REDIRECT_URI}&scope=${scope}&response_type=code`;
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
   .select('platform, status, last_sync_at')
   .eq('workspace_id', workspaceId);

  if (error) throw error;
  return data || [];
 } catch (error) {
  console.error('[messaging] Error fetching platforms:', error);
  return [];
 }
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
    contacts (first_name, last_name, avatar_url),
    messages (content, direction, sent_at, status)
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
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { error } = await supabase
   .from('messages')
   .insert({
    workspace_id: workspaceId,
    conversation_id: conversationId,
    direction: 'outbound',
    content,
    status: 'sending'
   });

  if (error) throw error;
  
  // Update conversation last_message_at
  await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);

  // If it's an email platform, send the actual email via Resend
  const { data: conv } = await supabase
   .from('conversations')
   .select('platform, contacts(email)')
   .eq('id', conversationId)
   .single();

  if (conv?.platform === 'email') {
   const contact = Array.isArray(conv.contacts) ? conv.contacts[0] : conv.contacts;
   if (contact?.email) {
    try {
     await sendEmail({
      to: contact.email,
      subject: 'New message from LeadsMind Support',
      text: content,
     });
    } catch (emailErr) {
     console.error('[messaging] Failed to send actual email:', emailErr);
    }
   }
  }

  return { success: true };
 } catch (error: any) {
  return { error: error.message || 'Failed to send message' };
 }
}
