'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { headers } from 'next/headers';

export async function getContact(id: string) {
 const workspaceId = await getCurrentWorkspaceId();
 const supabase = await createServerClient();
 
 let query = supabase
  .from('contacts')
  .select('*')
  .eq('id', id);

 if (workspaceId) {
  query = query.eq('workspace_id', workspaceId);
 }

 const { data, error } = await query.single();

 if (error) {
  console.error(`[contacts] Error fetching contact ${id}:`, error);
  return { success: false, error: error.message };
 }
 return { success: true, data };
}

export async function getContactActivities(contactId: string) {
 const supabase = await createServerClient();
 const { data, error } = await supabase
  .from('contact_activities')
  .select('*')
  .eq('contact_id', contactId)
  .order('created_at', { ascending: false });

 if (error) return { success: false, error: error.message };
 return { success: true, data };
}

export async function getContactNotes(contactId: string) {
 const supabase = await createServerClient();
 const { data, error } = await supabase
  .from('contact_notes')
  .select('*')
  .eq('contact_id', contactId)
  .order('created_at', { ascending: false });

 if (error) return { success: false, error: error.message };
 return { success: true, data };
}

export async function getContactTasks(contactId: string) {
 const supabase = await createServerClient();
 const { data, error } = await supabase
  .from('contact_tasks')
  .select('*')
  .eq('contact_id', contactId)
  .order('due_date', { ascending: true });

 if (error) return { success: false, error: error.message };
 return { success: true, data };
}

export async function getWorkspaceTags(workspaceId: string) {
  const supabase = await createServerClient();
  
  // 1. Get registry tags (Master list)
  const { data: registryTags } = await supabase
    .from('contact_tags_registry')
    .select('name')
    .eq('workspace_id', workspaceId);

  // 2. Get dynamic tags from contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('tags')
    .eq('workspace_id', workspaceId);

  const tagCounts: Record<string, number> = {};
  
  // Initialize with registry tags (even if count is 0)
  registryTags?.forEach(t => {
    tagCounts[t.name] = 0;
  });

  // Count from contacts
  contacts?.forEach((c: any) => {
    (c.tags || []).forEach((t: string) => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });

  return Object.entries(tagCounts).map(([name, count]) => ({
    id: name,
    name,
    count
  }));
}

export async function globalDeleteTag(tag: string) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Unauthorized' };
  const supabase = await createServerClient();
  
  // 1. Delete from Registry
  await supabase
    .from('contact_tags_registry')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('name', tag);

  // 2. Remove from Contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, tags')
    .eq('workspace_id', workspaceId)
    .contains('tags', [tag]);
   
  if (contacts) {
    for (const c of contacts) {
      const updatedTags = (c.tags || []).filter((t: string) => t !== tag);
      await supabase.from('contacts').update({ tags: updatedTags }).eq('id', c.id);
    }
  }
  revalidatePath('/contacts');
  revalidatePath('/contacts/tags');
  return { success: true };
}

export async function globalRenameTag(oldTag: string, newTag: string) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Unauthorized' };
  const supabase = await createServerClient();
  
  // 1. Update Registry
  await supabase
    .from('contact_tags_registry')
    .update({ name: newTag })
    .eq('workspace_id', workspaceId)
    .eq('name', oldTag);

  // 2. Update Contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, tags')
    .eq('workspace_id', workspaceId)
    .contains('tags', [oldTag]);
   
  if (contacts) {
    for (const c of contacts) {
      const updatedTags = (c.tags || []).map((t: string) => t === oldTag ? newTag : t);
      const uniqueTags = Array.from(new Set(updatedTags));
      await supabase.from('contacts').update({ tags: uniqueTags }).eq('id', c.id);
    }
  }
  revalidatePath('/contacts');
  revalidatePath('/contacts/tags');
  return { success: true };
}

export async function createRegistryTag(name: string) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'No active workspace' };

  const supabase = await createServerClient();
  const { error } = await supabase
    .from('contact_tags_registry')
    .insert({ workspace_id: workspaceId, name: name.trim() });

  if (error) {
    if (error.code === '23505') return { success: false, error: 'Tag already exists' };
    return { success: false, error: error.message };
  }

  revalidatePath('/contacts/tags');
  return { success: true };
}

export async function checkDuplicateContact(email: string) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId || !email) return { success: true, exists: false };

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('contacts')
    .select('id, first_name, last_name')
    .eq('workspace_id', workspaceId)
    .eq('email', email)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  return { success: true, exists: !!data, contact: data };
}

export async function createContact(values: any) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'No active workspace' };

  const supabase = await createServerClient();
  
  const payload: any = {
    workspace_id: workspaceId,
    first_name: values.firstName,
    last_name: values.lastName,
    email: values.email,
    phone: values.phone,
    source: values.source,
    owner_id: values.ownerId || null,
    tags: values.tags || [],
  };

  if (values.consentTimestamp) {
    payload.consent_timestamp = values.consentTimestamp;
    if (values.consentIp) {
      payload.consent_ip = values.consentIp;
    } else {
      try {
        const reqHeaders = headers();
        payload.consent_ip = reqHeaders.get('x-forwarded-for')?.split(',')[0] || reqHeaders.get('x-real-ip') || 'unknown';
      } catch (e) {
        payload.consent_ip = 'unknown';
      }
    }
  }
  if (values.consentFormId) payload.consent_form_id = values.consentFormId;
  if (values.processingPurposeScope) payload.processing_purpose_scope = values.processingPurposeScope;

  const { data, error } = await supabase
    .from('contacts')
    .insert(payload)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  
  // Automated Audit Log for creation
  await supabase.from('contact_activities').insert({
    workspace_id: workspaceId,
    contact_id: data.id,
    type: 'edit',
    description: `Contact created manually`,
    metadata: { source: values.source || 'form' }
  });

  revalidatePath('/contacts');
  return { success: true, data };
}

export async function updateContact(id: string, values: any) {
 const supabase = await createServerClient();
 
 const payload = {
  first_name: values.firstName,
  last_name: values.lastName,
  email: values.email,
  phone: values.phone,
  source: values.source,
  owner_id: values.ownerId || null,
  tags: values.tags || [],
 };

 const { data, error } = await supabase
  .from('contacts')
  .update(payload)
  .eq('id', id)
  .select()
  .single();

 if (error) return { success: false, error: error.message };
 
 revalidatePath('/contacts');
 revalidatePath(`/contacts/${id}`);
 return { success: true, data };
}

export async function deleteContact(id: string) {
 const supabase = await createServerClient();
 const { error } = await supabase
  .from('contacts')
  .delete()
  .eq('id', id);

 if (error) return { success: false, error: error.message };
 
 revalidatePath('/contacts');
 return { success: true };
}


export async function addTag(contactId: string, tag: string) {
  const supabase = await createServerClient();
  
  // Get current tags
  const { data: contact, error: fetchError } = await supabase
    .from('contacts')
    .select('tags')
    .eq('id', contactId)
    .single();

  if (fetchError) {
    console.error(`[contacts] Error fetching tags for ${contactId}:`, fetchError);
    return { success: false, error: fetchError.message };
  }

  if (!contact) {
    return { success: false, error: 'Contact not found' };
  }

  const tags = contact.tags || [];
  if (tags.includes(tag)) return { success: true };

  const { error: updateError } = await supabase
    .from('contacts')
    .update({ 
      tags: [...tags, tag],
      updated_at: new Date().toISOString()
    })
    .eq('id', contactId);

  if (updateError) {
    console.error(`[contacts] Error updating tags for ${contactId}:`, updateError);
    return { success: false, error: updateError.message };
  }
  
  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

export async function bulkAddTag(ids: string[], tag: string): Promise<{ success: boolean; error?: string }> {
  const workspaceId = await getCurrentWorkspaceId();
  const supabase = await createServerClient();
  const successfulIds: string[] = [];

  for (const id of ids) {
    const res = await addTag(id, tag);
    if (res.success) {
      successfulIds.push(id);
    } else {
      // If any fail, we should probably stop or at least report it
      return { success: false, error: `Failed to update contact ${id}: ${res.error}` };
    }
  }

  if (successfulIds.length > 0) {
    // Bulk Log Activity
    const activities = successfulIds.map(id => ({
      workspace_id: workspaceId,
      contact_id: id,
      type: 'system',
      description: `Strategic tag added: ${tag}`,
      metadata: { tag, operation: 'bulk_tag', event: 'tagging' }
    }));

    const { error: logError } = await supabase.from('contact_activities').insert(activities);
    if (logError) return { success: false, error: logError.message };
  }

  revalidatePath('/contacts');
  revalidatePath('/contacts/tags');
  return { success: true };
}

export async function bulkRemoveTag(ids: string[], tag: string) {
  const workspaceId = await getCurrentWorkspaceId();
  const supabase = await createServerClient();
  
  for (const id of ids) {
    const { data: contact, error: fetchError } = await supabase
      .from('contacts')
      .select('tags')
      .eq('id', id)
      .single();

    if (fetchError || !contact) {
      console.error(`[contacts] Error fetching tags for ${id}:`, fetchError);
      continue; // Or return error
    }

    const tags = (contact.tags || []).filter((t: string) => t !== tag);
    const { error: updateError } = await supabase
      .from('contacts')
      .update({ 
        tags,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (updateError) {
      console.error(`[contacts] Error removing tag from ${id}:`, updateError);
      return { success: false, error: updateError.message };
    }
  }

  revalidatePath('/contacts');
  revalidatePath('/contacts/tags');
  return { success: true };
}



export async function createNote(values: { contactId: string; content: string }) {
 const workspaceId = await getCurrentWorkspaceId();
 const supabase = await createServerClient();
 
 const { data, error } = await supabase
  .from('contact_notes')
  .insert({
   workspace_id: workspaceId,
   contact_id: values.contactId,
   content: values.content
  })
  .select()
  .single();

 if (error) return { success: false, error: error.message };
 
 // Log activity
 await supabase.from('contact_activities').insert({
  workspace_id: workspaceId,
  contact_id: values.contactId,
  type: 'note',
  description: `Added a new note`
 });

 revalidatePath(`/contacts/${values.contactId}`);
 return { success: true, data };
}

export async function deleteNote(id: string, contactId: string) {
 const supabase = await createServerClient();
 const { error } = await supabase
  .from('contact_notes')
  .delete()
  .eq('id', id);

 if (error) return { success: false, error: error.message };
 
 revalidatePath(`/contacts/${contactId}`);
 return { success: true };
}

export async function createTask(values: { contactId: string; title: string }) {
 const workspaceId = await getCurrentWorkspaceId();
 const supabase = await createServerClient();
 
 const { data, error } = await supabase
  .from('contact_tasks')
  .insert({
   workspace_id: workspaceId,
   contact_id: values.contactId,
   title: values.title,
   status: 'todo'
  })
  .select()
  .single();

 if (error) return { success: false, error: error.message };
 
 revalidatePath(`/contacts/${values.contactId}`);
 return { success: true, data };
}

export async function toggleTaskStatus(id: string, contactId: string, currentStatus: string) {
 const supabase = await createServerClient();
 const newStatus = currentStatus === 'todo' ? 'completed' : 'todo';
 
 const { error } = await supabase
  .from('contact_tasks')
  .update({ status: newStatus })
  .eq('id', id);

 if (error) return { success: false, error: error.message };
 
 revalidatePath(`/contacts/${contactId}`);
 return { success: true };
}


export async function deleteTask(id: string) {
 const supabase = await createServerClient();
 const { error } = await supabase
  .from('contact_tasks')
  .delete()
  .eq('id', id);

 if (error) return { success: false, error: error.message };
 
 return { success: true };
}


export async function searchContacts(query: string) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Unauthorized' };
  
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email')
    .eq('workspace_id', workspaceId)
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(10);

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}
