'use server';

import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { logger } from '@/shared/logger';

export async function getContactDocuments(contactId: string) {
 const supabase = await createServerClient();
 const { data: { user }, error: authError } = await supabase.auth.getUser();
 if (authError || !user) {
  return [];
 }

 const cookieStore = cookies();
 const workspaceId = cookieStore.get('active_workspace_id')?.value;
 if (!workspaceId) {
  return [];
 }

 const { data, error } = await supabase
  .from('contact_documents')
  .select('*')
  .eq('contact_id', contactId)
  .order('created_at', { ascending: false });

 if (error) {
  logger.error({ err: error, contactId }, 'media.contact_documents.fetch.failed');
  return [];
 }
 return data || [];
}
