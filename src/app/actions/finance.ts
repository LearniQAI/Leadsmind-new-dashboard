'use server';

import { createServerClient } from '@/lib/supabase/server';

export async function getInvoices(workspaceId: string, contactId?: string) {
  const supabase = await createServerClient();
  let query = supabase
    .from('invoices')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (contactId) {
    query = query.eq('contact_id', contactId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('[finance] Error fetching invoices:', error);
    return [];
  }
  return data || [];
}

export async function getQuotes(workspaceId: string, contactId?: string) {
  const supabase = await createServerClient();
  // Assuming quotes table exists or using a filtered invoices table if they are same
  // For now, let's try to fetch from 'quotes' table
  let query = supabase
    .from('quotes')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (contactId) {
    query = query.eq('contact_id', contactId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    // If quotes table doesn't exist, return empty
    return [];
  }
  return data || [];
}
