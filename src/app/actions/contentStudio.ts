'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId, getUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { logger } from '@/shared/logger';

// Helper to map content types to PRD explicit ENUM values
function mapContentType(type: string, platform?: string): string {
  const t = type || 'generic';
  if (t === 'blog') return 'blog_post';
  if (t === 'email') return 'email_marketing';
  if (t === 'other') return 'generic';
  if (t === 'social') {
    if (platform === 'twitter') return 'social_twitter';
    if (platform === 'linkedin') return 'social_linkedin';
    if (platform === 'facebook') return 'social_facebook';
    if (platform === 'instagram') return 'social_instagram';
    return 'social_linkedin';
  }
  const validTypes = [
    'blog_post', 'social_instagram', 'social_linkedin', 'social_facebook', 
    'social_twitter', 'email_marketing', 'newsletter', 'ad_copy', 'sms', 
    'press_release', 'generic'
  ];
  if (validTypes.includes(t)) return t;
  return 'generic';
}

function mapStatus(status: string): string {
  const s = status || 'draft';
  if (['draft', 'review', 'ready', 'published', 'template'].includes(s)) return s;
  return 'draft';
}

export async function getDocuments(filters?: { search?: string; contentType?: string; status?: string }) {
  try {
    const wsId = await getCurrentWorkspaceId();
    if (!wsId) return { error: 'No active workspace context' };
    const supabase = await createServerClient();

    let query = supabase.from('content_studio_documents').select('*').eq('workspace_id', wsId);

    if (filters?.contentType && filters.contentType !== 'all') {
      const mappedType = mapContentType(filters.contentType);
      query = query.eq('content_type', mappedType);
    }

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', mapStatus(filters.status));
    } else {
      query = query.neq('status', 'template');
    }

    if (filters?.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });
    if (error) throw error;

    return { data: data || [] };
  } catch (err: any) {
    logger.error({ err: err }, 'get.documents.failed');
    return { error: 'Fetch documents failed' };
  }
}

export async function getDocument(id: string) {
  try {
    const wsId = await getCurrentWorkspaceId();
    if (!wsId) return { error: 'No active workspace context' };
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('content_studio_documents')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', wsId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { error: 'Document not found' };

    return { data };
  } catch (err: any) {
    logger.error({ err: err }, 'get.document.failed');
    return { error: 'Fetch document failed' };
  }
}

export async function createDocument(payload: {
  title: string;
  body_html: string;
  body_plain: string;
  content_type: string;
  target_platform: string;
  status: string;
}) {
  try {
    const wsId = await getCurrentWorkspaceId();
    if (!wsId) return { error: 'No active workspace context' };
    const user = await getUser();
    const supabase = await createServerClient();

    const plain = payload.body_plain || '';
    const wordCount = plain.split(/\s+/).filter(Boolean).length;
    const charCount = plain.length;

    const { data, error } = await supabase
      .from('content_studio_documents')
      .insert({
        workspace_id: wsId,
        team_member_id: user?.id || null,
        title: payload.title || 'Untitled Document',
        body_html: payload.body_html || '',
        body_plain: plain,
        content_type: mapContentType(payload.content_type, payload.target_platform),
        target_platform: payload.target_platform || 'custom',
        status: mapStatus(payload.status),
        word_count: wordCount,
        character_count: charCount
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/content-studio');
    return { data };
  } catch (err: any) {
    logger.error({ err: err }, 'create.document.failed');
    return { error: 'Create document failed' };
  }
}

export async function updateDocument(
  id: string,
  updates: {
    title?: string;
    body_html?: string;
    body_plain?: string;
    content_type?: string;
    target_platform?: string;
    status?: string;
    grammar_score?: number;
    grammar_issues_count?: number;
    plagiarism_score?: number;
    plagiarism_checked_at?: string;
    seo_score?: number;
    seo_target_keyword?: string;
    meta_description?: string;
    published_to?: string[];
  }
) {
  try {
    const wsId = await getCurrentWorkspaceId();
    if (!wsId) return { error: 'No active workspace context' };
    const supabase = await createServerClient();

    const dbUpdates: any = { ...updates };
    if (updates.content_type !== undefined) {
      dbUpdates.content_type = mapContentType(updates.content_type, updates.target_platform);
    }
    if (updates.status !== undefined) {
      dbUpdates.status = mapStatus(updates.status);
    }
    if (updates.body_plain !== undefined) {
      dbUpdates.word_count = updates.body_plain.split(/\s+/).filter(Boolean).length;
      dbUpdates.character_count = updates.body_plain.length;
    }

    const { data, error } = await supabase
      .from('content_studio_documents')
      .update({
        ...dbUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', wsId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/content-studio');
    revalidatePath(`/content-studio/${id}`);
    return { data };
  } catch (err: any) {
    logger.error({ err: err }, 'update.document.failed');
    return { error: 'Update document failed' };
  }
}

export async function deleteDocument(id: string) {
  try {
    const wsId = await getCurrentWorkspaceId();
    if (!wsId) return { error: 'No active workspace context' };
    const supabase = await createServerClient();

    const { error } = await supabase
      .from('content_studio_documents')
      .delete()
      .eq('id', id)
      .eq('workspace_id', wsId);

    if (error) throw error;

    revalidatePath('/content-studio');
    return { success: true };
  } catch (err: any) {
    logger.error({ err: err }, 'delete.document.failed');
    return { error: 'Delete document failed' };
  }
}

export async function getDocumentVersions(documentId: string) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('content_studio_document_versions')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [] };
  } catch (err: any) {
    logger.error({ err: err }, 'get.document.versions.failed');
    return { error: 'Fetch document versions failed' };
  }
}

export async function createDocumentVersion(
  documentId: string,
  payload: { title: string; body_html: string; body_plain: string }
) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('content_studio_document_versions')
      .insert({
        document_id: documentId,
        title: payload.title,
        body_html: payload.body_html,
        body_plain: payload.body_plain,
      })
      .select()
      .single();

    if (error) throw error;

    // Prune logic to only keep the latest 10 versions
    const { data: versions } = await supabase
      .from('content_studio_document_versions')
      .select('id')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false });

    if (versions && versions.length > 10) {
      const oldestIds = versions.slice(10).map((v) => v.id);
      await supabase
        .from('content_studio_document_versions')
        .delete()
        .in('id', oldestIds);
    }

    return { data };
  } catch (err: any) {
    logger.error({ err: err }, 'create.document.version.failed');
    return { error: 'Save document version failed' };
  }
}

export async function sendDocumentToContact(contactId: string, subject: string, plainText: string) {
  try {
    const wsId = await getCurrentWorkspaceId();
    if (!wsId) return { error: 'No active workspace context' };
    const supabase = await createServerClient();

    // 1. Fetch contact details
    const { data: contact, error: contactErr } = await supabase
      .from('contacts')
      .select('first_name, last_name, email')
      .eq('id', contactId)
      .eq('workspace_id', wsId)
      .single();

    if (contactErr || !contact) {
      return { error: 'Contact not found or access denied.' };
    }

    if (!contact.email) {
      return { error: 'This contact does not have a valid email address.' };
    }

    // 2. Find if a conversation of platform 'email' exists with this contact
    const { data: conversation, error: convErr } = await supabase
      .from('conversations')
      .select('id')
      .eq('workspace_id', wsId)
      .eq('contact_id', contactId)
      .eq('platform', 'email')
      .maybeSingle();

    let conversationId = conversation?.id;

    // 3. Create a conversation if it doesn't exist
    if (!conversationId) {
      const { data: newConv, error: newConvErr } = await supabase
        .from('conversations')
        .insert({
          workspace_id: wsId,
          contact_id: contactId,
          platform: 'email',
          title: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Custom Email Conversation',
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();

      if (newConvErr || !newConv) {
        return { error: `Failed to initialize conversation: ${newConvErr?.message}` };
      }
      conversationId = newConv.id;
    }

    // 4. Send the message (which inserts into messages and triggers Resend email send)
    const { sendMessage } = await import('@/app/actions/messaging');
    const sendRes = await sendMessage(conversationId, plainText);
    
    if (sendRes.error) {
      return { error: sendRes.error };
    }

    return { success: true };
  } catch (err: any) {
    logger.error({ err: err }, 'send.document.to.contact.failed');
    return { error: 'Send message failed' };
  }
}

export async function saveAsContentTemplate(payload: { title: string; body_html: string; body_plain: string }) {
  try {
    const wsId = await getCurrentWorkspaceId();
    if (!wsId) return { error: 'No active workspace context' };
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('content_studio_documents')
      .insert({
        workspace_id: wsId,
        title: payload.title || 'Untitled Template',
        body_html: payload.body_html || '',
        body_plain: payload.body_plain || '',
        content_type: 'generic',
        target_platform: 'custom',
        status: 'template'
      })
      .select()
      .single();

    if (error) throw error;
    return { data };
  } catch (err: any) {
    logger.error({ err: err }, 'save.as.content.template.failed');
    return { error: 'Save template failed' };
  }
}
