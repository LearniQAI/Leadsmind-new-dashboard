'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { headers } from 'next/headers';
import { ForbiddenError, UnauthorizedError } from '@/lib/errors';
import { ContactRepository } from '@/modules/crm/repository/ContactRepository';
import { ContactService } from '@/modules/crm/service/ContactService';

async function getContactService() {
 const supabase = await createServerClient();
 return new ContactService(new ContactRepository(supabase));
}

// Confirms the caller is authenticated and a member of the active workspace.
// Throws UnauthorizedError/ForbiddenError otherwise — used by mutations that
// previously duplicated this check inline.
async function requireWorkspaceAccess(): Promise<{ userId: string; workspaceId: string }> {
 const supabase = await createServerClient();

 const { data: { user }, error: userError } = await supabase.auth.getUser();
 if (userError || !user) {
  throw new UnauthorizedError();
 }

 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) {
  throw new ForbiddenError('No active workspace');
 }

 const { data: membership } = await supabase
  .from('workspace_members')
  .select('id')
  .eq('workspace_id', workspaceId)
  .eq('user_id', user.id)
  .maybeSingle();

 if (!membership) {
  throw new ForbiddenError('Not a member of this workspace');
 }

 return { userId: user.id, workspaceId };
}

export async function getContact(id: string) {
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) return { success: false, error: 'No active workspace' };

 const service = await getContactService();
 const result = await service.getContact(id, workspaceId);
 if (result.success === false) return { success: false, error: result.error };
 return { success: true, data: result.data };
}

export async function getContactActivities(contactId: string) {
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) return { success: false, error: 'No active workspace' };

 const service = await getContactService();
 const result = await service.getContactActivities(contactId, workspaceId);
 if (result.success === false) return { success: false, error: result.error };
 return { success: true, data: result.data };
}

export async function getContactNotes(contactId: string) {
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) return { success: false, error: 'No active workspace' };

 const service = await getContactService();
 const result = await service.getContactNotes(contactId, workspaceId);
 if (result.success === false) return { success: false, error: result.error };
 return { success: true, data: result.data };
}

export async function getContactTasks(contactId: string) {
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) return { success: false, error: 'No active workspace' };

 const service = await getContactService();
 const result = await service.getContactTasks(contactId, workspaceId);
 if (result.success === false) return { success: false, error: result.error };
 return { success: true, data: result.data };
}

export async function getWorkspaceTags() {
 try {
  const { workspaceId } = await requireWorkspaceAccess();
  const service = await getContactService();
  const result = await service.getWorkspaceTags(workspaceId);
  if (result.success === false) return [];
  return result.data;
 } catch {
  return [];
 }
}

export async function globalDeleteTag(tag: string) {
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) return { success: false, error: 'Unauthorized' };

 const service = await getContactService();
 const result = await service.globalDeleteTag(workspaceId, tag);
 if (result.success === false) return { success: false, error: result.error };

 revalidatePath('/contacts');
 revalidatePath('/contacts/tags');
 return { success: true };
}

export async function globalRenameTag(oldTag: string, newTag: string) {
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) return { success: false, error: 'Unauthorized' };

 const service = await getContactService();
 const result = await service.globalRenameTag(workspaceId, oldTag, newTag);
 if (result.success === false) return { success: false, error: result.error };

 revalidatePath('/contacts');
 revalidatePath('/contacts/tags');
 return { success: true };
}

export async function createRegistryTag(name: string) {
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) return { success: false, error: 'No active workspace' };

 const service = await getContactService();
 const result = await service.createRegistryTag(workspaceId, name);
 if (result.success === false) return { success: false, error: result.error };

 revalidatePath('/contacts/tags');
 return { success: true };
}

export async function checkDuplicateContact(email: string) {
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId || !email) return { success: true, exists: false };

 const service = await getContactService();
 const result = await service.checkDuplicateContact(workspaceId, email);
 if (result.success === false) return { success: false, error: result.error };

 return { success: true, exists: result.data.exists, contact: result.data.contact };
}

export async function createContact(values: any) {
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) return { success: false, error: 'No active workspace' };

 // Resolve consent IP from request headers when the caller didn't supply one.
 let consentIp = values.consentIp;
 if (values.consentTimestamp && !consentIp) {
  try {
   const reqHeaders = headers();
   consentIp = reqHeaders.get('x-forwarded-for')?.split(',')[0] || reqHeaders.get('x-real-ip') || 'unknown';
  } catch (e) {
   consentIp = 'unknown';
  }
 }

 const service = await getContactService();
 const result = await service.createContact(workspaceId, { ...values, consentIp });
 if (result.success === false) return { success: false, error: result.error };

 revalidatePath('/contacts');
 return { success: true, data: result.data };
}

export async function updateContact(id: string, values: any) {
 const { workspaceId } = await requireWorkspaceAccess();

 const service = await getContactService();
 const result = await service.updateContact(id, workspaceId, values);
 if (result.success === false) return { success: false, error: result.error };

 revalidatePath('/contacts');
 revalidatePath(`/contacts/${id}`);
 return { success: true, data: result.data };
}

export async function deleteContact(id: string) {
 const { workspaceId } = await requireWorkspaceAccess();

 const service = await getContactService();
 const result = await service.deleteContact(id, workspaceId);
 if (result.success === false) return { success: false, error: result.error };

 revalidatePath('/contacts');
 return { success: true };
}

export async function addTag(contactId: string, tag: string) {
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) return { success: false, error: 'No active workspace' };

 const service = await getContactService();
 const result = await service.addTag(contactId, workspaceId, tag);
 if (result.success === false) return { success: false, error: result.error };

 revalidatePath(`/contacts/${contactId}`);
 return { success: true };
}

export async function bulkAddTag(ids: string[], tag: string) {
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) return { success: false, error: 'No active workspace' };

 const service = await getContactService();
 const result = await service.bulkAddTag(ids, tag, workspaceId);
 if (result.success === false) return { success: false, error: result.error };

 revalidatePath('/contacts');
 revalidatePath('/contacts/tags');
 return { success: true };
}

export async function bulkRemoveTag(ids: string[], tag: string) {
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) return { success: false, error: 'No active workspace' };

 const service = await getContactService();
 const result = await service.bulkRemoveTag(ids, tag, workspaceId);
 if (result.success === false) return { success: false, error: result.error };

 revalidatePath('/contacts');
 revalidatePath('/contacts/tags');
 return { success: true };
}

export async function createNote(values: { contactId: string; content: string }) {
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) return { success: false, error: 'No active workspace' };

 const service = await getContactService();
 const result = await service.createNote(workspaceId, values.contactId, values.content);
 if (result.success === false) return { success: false, error: result.error };

 revalidatePath(`/contacts/${values.contactId}`);
 return { success: true, data: result.data };
}

export async function deleteNote(id: string, contactId: string) {
 const { workspaceId } = await requireWorkspaceAccess();

 const service = await getContactService();
 const result = await service.deleteNote(id, workspaceId);
 if (result.success === false) return { success: false, error: result.error };

 revalidatePath(`/contacts/${contactId}`);
 return { success: true };
}

export async function createTask(values: { contactId: string; title: string }) {
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) return { success: false, error: 'No active workspace' };

 const service = await getContactService();
 const result = await service.createTask(workspaceId, values.contactId, values.title);
 if (result.success === false) return { success: false, error: result.error };

 revalidatePath(`/contacts/${values.contactId}`);
 return { success: true, data: result.data };
}

export async function toggleTaskStatus(id: string, contactId: string, currentStatus: string) {
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) return { success: false, error: 'No active workspace' };

 const service = await getContactService();
 const result = await service.toggleTaskStatus(id, workspaceId, currentStatus);
 if (result.success === false) return { success: false, error: result.error };

 revalidatePath(`/contacts/${contactId}`);
 return { success: true };
}

export async function deleteTask(id: string) {
 const { workspaceId } = await requireWorkspaceAccess();

 const service = await getContactService();
 const result = await service.deleteTask(id, workspaceId);
 if (result.success === false) return { success: false, error: result.error };

 return { success: true };
}

export async function searchContacts(query: string) {
 const workspaceId = await getCurrentWorkspaceId();
 if (!workspaceId) return { success: false, error: 'Unauthorized' };

 const service = await getContactService();
 const result = await service.searchContacts(workspaceId, query);
 if (result.success === false) return { success: false, error: result.error };
 return { success: true, data: result.data };
}
