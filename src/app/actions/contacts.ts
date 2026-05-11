'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentWorkspaceId } from '@/lib/auth';

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
 
 // Tags are stored as a TEXT[] in contacts. 
 // To get a list of all unique tags, we can use a raw SQL query or aggregate them.
 // For simplicity, we'll fetch all contacts and flatten their tags in this version,
 // but a dedicated 'tags' table would be better for scaling.
 const { data: contacts } = await supabase
  .from('contacts')
  .select('tags')
  .eq('workspace_id', workspaceId);

 if (!contacts) return [];

 const tagCounts: Record<string, number> = {};
 contacts.forEach(c => {
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

export async function createContact(values: any) {
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) return { success: false, error: 'No active workspace' };

 const supabase = await createServerClient();
 
 const payload = {
  workspace_id: workspaceId,
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
  .insert(payload)
  .select()
  .single();

 if (error) return { success: false, error: error.message };
 
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
 const { data: contact } = await supabase
  .from('contacts')
  .select('tags')
  .eq('id', contactId)
  .single();

 const tags = contact?.tags || [];
 if (tags.includes(tag)) return { success: true };

 const { error } = await supabase
  .from('contacts')
  .update({ tags: [...tags, tag] })
  .eq('id', contactId);

 if (error) return { success: false, error: error.message };
 
 revalidatePath(`/contacts/${contactId}`);
 return { success: true };
}

export async function bulkAddTag(ids: string[], tag: string) {
 for (const id of ids) {
  const res = await addTag(id, tag);
  if (!res.success) return res;
 }

 revalidatePath('/contacts');
 return { success: true };
}

export async function bulkRemoveTag(ids: string[], tag: string) {
 const supabase = await createServerClient();
 
 for (const id of ids) {
  const { data: contact } = await supabase
   .from('contacts')
   .select('tags')
   .eq('id', id)
   .single();

  const tags = (contact?.tags || []).filter((t: string) => t !== tag);
  const { error } = await supabase
   .from('contacts')
   .update({ tags })
   .eq('id', id);
  
  if (error) return { success: false, error: error.message };
 }

 revalidatePath('/contacts');
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

