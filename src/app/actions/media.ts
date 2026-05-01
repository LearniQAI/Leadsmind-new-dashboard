'use server';

import { createServerClient } from '@/lib/supabase/server';

export async function getContactDocuments(contactId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('contact_documents')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[media] Error fetching documents:', error);
    return [];
  }
  return data || [];
}
