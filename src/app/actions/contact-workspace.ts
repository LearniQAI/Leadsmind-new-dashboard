'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { ContactDiscoveryService } from '@/lib/lead-finder/ContactDiscoveryService';
import { logger } from '@/shared/logger';
import { toClientError } from '@/shared/errors/AppError';

export async function discoverAndSaveContacts(leadId: string, businessName: string, website?: string) {
  const supabase = await createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return { success: false, error: 'Unauthorized' };

  try {
    // 1. Check if we already discovered contacts
    const { data: existing } = await supabase.from('lead_contacts').select('id').eq('result_id', leadId);
    if (existing && existing.length > 0) {
      return { success: true, count: existing.length };
    }

    // 2. Discover
    const contacts = await ContactDiscoveryService.discoverContacts(businessName, website);
    
    if (contacts.length === 0) return { success: true, count: 0 };

    // 3. Save
    const payload = contacts.map(c => ({
      result_id: leadId,
      user_id: userId,
      ...c
    }));

    const { error } = await supabase.from('lead_contacts').insert(payload);
    if (error) throw error;

    revalidatePath(`/lead-finder/lead/${leadId}`);
    return { success: true, count: contacts.length };

  } catch (error: any) {
    logger.error({ err: error, leadId }, 'contact_workspace.discover_contacts.failed');
    const clientError = toClientError(error);
    return { success: false, error: clientError.error };
  }
}

export async function getContactDetails(contactId: string) {
  const supabase = await createServerClient();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Unauthorized' };

  const { data: contact, error: contactError } = await supabase
    .from('lead_contacts')
    .select(`
      *,
      lead_finder_results(business_name, category, website, phone, industry)
    `)
    .eq('id', contactId)
    .single();

  if (contactError) {
    logger.error({ err: contactError, contactId }, 'contact_workspace.contact_details.fetch.failed');
    return { success: false, error: 'Failed to fetch contact details.' };
  }

  const { data: notes } = await supabase
    .from('contact_notes')
    .select('*, auth_user:user_id(email)')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  const { data: activities } = await supabase
    .from('contact_activities')
    .select('*, auth_user:user_id(email)')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  return { 
    success: true, 
    data: { 
      contact, 
      notes: notes || [], 
      activities: activities || [] 
    } 
  };
}

async function logActivity(supabase: any, contactId: string, userId: string, type: string, description: string, metadata: any = {}) {
  await supabase.from('contact_activities').insert({
    contact_id: contactId,
    user_id: userId,
    type,
    description,
    metadata
  });
}

export async function addContactNote(contactId: string, content: string) {
  const supabase = await createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return { success: false, error: 'Unauthorized' };

  const { error } = await supabase
    .from('contact_notes')
    .insert({ contact_id: contactId, user_id: userId, content });

  if (error) {
    logger.error({ err: error, contactId }, 'contact_workspace.note.add.failed');
    return { success: false, error: 'Failed to add note.' };
  }

  await logActivity(supabase, contactId, userId, 'note_added', 'Added a new note');
  revalidatePath(`/lead-finder/contact/${contactId}`);
  return { success: true };
}

export async function updateContactStatus(contactId: string, status: string) {
  const supabase = await createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return { success: false, error: 'Unauthorized' };
  const workspaceId = await getCurrentWorkspaceId();

  const { error } = await supabase
    .from('lead_contacts')
    .update({ status })
    .eq("id", contactId).eq("workspace_id", workspaceId);

  if (error) {
    logger.error({ err: error, contactId, workspaceId }, 'contact_workspace.status.update.failed');
    return { success: false, error: 'Failed to update status.' };
  }

  await logActivity(supabase, contactId, userId, 'status_change', `Updated status to ${status}`, { status });
  revalidatePath(`/lead-finder/contact/${contactId}`);
  return { success: true };
}

export async function assignContactToPipeline(contactId: string) {
  const supabase = await createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  const workspaceId = await getCurrentWorkspaceId();
  if (!userId || !workspaceId) return { success: false, error: 'Unauthorized' };

  // 1. Fetch Contact & Lead Data
  const { data: contact, error: contactError } = await supabase
    .from('lead_contacts')
    .select('*, lead_finder_results(*)')
    .eq('id', contactId)
    .single();

  if (contactError || !contact) return { success: false, error: 'Contact not found' };

  const lead = contact.lead_finder_results;

  // 2. Fetch or select pipeline stage
  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('id')
    .eq('workspace_id', workspaceId)
    .order('position', { ascending: true })
    .limit(1);
    
  if (!stages || stages.length === 0) {
    return { success: false, error: 'No pipeline stages found. Please create a pipeline first.' };
  }
  const finalStageId = stages[0].id;

  // 3. Create CRM Contact
  const { data: crmContact } = await supabase
    .from('contacts')
    .insert({
      workspace_id: workspaceId,
      first_name: contact.first_name || lead?.business_name || 'Unknown Contact',
      last_name: contact.last_name || null,
      email: contact.email || null,
      phone: lead?.phone || null,
      source: 'Lead Finder',
      tags: [...(lead?.smart_tags || []), 'Lead Finder', 'Enriched Contact']
    })
    .select('id')
    .single();

  // 4. Create CRM Opportunity
  if (crmContact) {
    await supabase
      .from('opportunities')
      .insert({
        workspace_id: workspaceId,
        contact_id: crmContact.id,
        stage_id: finalStageId,
        title: `${contact.first_name || lead?.business_name || 'Contact'} Opportunity`,
        value: 0,
        status: 'open',
        position: 0
      });
  }

  // 5. Update local status
  const { error } = await supabase
    .from('lead_contacts')
    .update({ 
      status: 'Qualified' 
    })
    .eq("id", contactId).eq("workspace_id", workspaceId);

  if (error) logger.error({ err: error, contactId, workspaceId }, 'contact_workspace.pipeline_status.update.failed');

  await logActivity(supabase, contactId, userId, 'crm_push', 'Pushed contact to CRM Pipeline');
  revalidatePath(`/lead-finder/contact/${contactId}`);
  revalidatePath('/pipelines');
  revalidatePath('/contacts');
  return { success: true };
}
