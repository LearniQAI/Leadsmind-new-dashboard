'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireWorkspaceAccess } from '@/lib/auth';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { TagRepository, TagEntityType } from '@/modules/tags/repository/TagRepository';
import { TagService } from '@/modules/tags/service/TagService';

async function getTagService() {
  const supabase = await createServerClient();
  return new TagService(new TagRepository(supabase));
}

function revalidateEntityPaths(entityType: TagEntityType, entityId?: string) {
  revalidatePath('/contacts/tags');
  if (entityType === 'contact') {
    revalidatePath('/contacts');
    if (entityId) revalidatePath(`/contacts/${entityId}`);
  } else if (entityType === 'deal') {
    revalidatePath('/pipelines');
  }
}

// ---------- categories (governance: admin/owner only) ----------

export async function listTagCategories() {
  const { workspaceId } = await requireWorkspaceAccess();
  const service = await getTagService();
  const result = await service.listCategories(workspaceId);
  if (result.success === false) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function createTagCategory(payload: { name: string; color?: string; icon?: string; sortOrder?: number }) {
  const { workspaceId } = await requireWorkspaceRole(['admin', 'owner']);
  const service = await getTagService();
  const result = await service.createCategory(workspaceId, payload);
  if (result.success === false) return { success: false, error: result.error };

  revalidatePath('/contacts/tags');
  return { success: true, data: result.data };
}

export async function updateTagCategory(
  id: string,
  payload: Partial<{ name: string; color: string | null; icon: string | null; sortOrder: number }>,
) {
  const { workspaceId } = await requireWorkspaceRole(['admin', 'owner']);
  const service = await getTagService();
  const result = await service.updateCategory(id, workspaceId, payload);
  if (result.success === false) return { success: false, error: result.error };

  revalidatePath('/contacts/tags');
  return { success: true, data: result.data };
}

export async function deleteTagCategory(id: string) {
  const { workspaceId } = await requireWorkspaceRole(['admin', 'owner']);
  const service = await getTagService();
  const result = await service.deleteCategory(id, workspaceId);
  if (result.success === false) return { success: false, error: result.error };

  revalidatePath('/contacts/tags');
  return { success: true };
}

export async function reorderTagCategories(orderedIds: string[]) {
  const { workspaceId } = await requireWorkspaceRole(['admin', 'owner']);
  const service = await getTagService();
  const result = await service.reorderCategories(workspaceId, orderedIds);
  if (result.success === false) return { success: false, error: result.error };

  revalidatePath('/contacts/tags');
  return { success: true };
}

// ---------- tags ----------

export async function listTags() {
  const { workspaceId, userId } = await requireWorkspaceAccess();
  const service = await getTagService();
  const result = await service.listTags(workspaceId, userId);
  if (result.success === false) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function searchTags(query: string) {
  const { workspaceId, userId } = await requireWorkspaceAccess();
  const service = await getTagService();
  const result = await service.searchTags(workspaceId, userId, query);
  if (result.success === false) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function createTag(payload: {
  name: string;
  color?: string;
  icon?: string;
  categoryId?: string | null;
  visibility?: 'private' | 'team' | 'company';
  parentTagId?: string | null;
  expiresAt?: string | null;
}) {
  const { workspaceId, userId } = await requireWorkspaceAccess();
  const service = await getTagService();
  const result = await service.createTag(workspaceId, userId, payload);
  if (result.success === false) return { success: false, error: result.error };

  revalidatePath('/contacts/tags');
  return { success: true, data: result.data };
}

export async function updateTag(
  id: string,
  payload: Partial<{
    name: string;
    color: string | null;
    icon: string | null;
    categoryId: string | null;
    visibility: 'private' | 'team' | 'company';
    parentTagId: string | null;
    expiresAt: string | null;
  }>,
) {
  const { workspaceId } = await requireWorkspaceAccess();
  const service = await getTagService();
  const result = await service.updateTag(id, workspaceId, payload);
  if (result.success === false) return { success: false, error: result.error };

  const supabase = await createServerClient();
  const { data: assignedContacts } = await supabase
    .from('tag_assignments')
    .select('entity_id')
    .eq('tag_id', id)
    .eq('entity_type', 'contact')
    .eq('workspace_id', workspaceId);
  for (const row of assignedContacts ?? []) {
    publishTagEvent('tag_updated', workspaceId, 'contact', row.entity_id, id);
  }

  revalidatePath('/contacts/tags');
  return { success: true, data: result.data };
}

export async function deleteTag(id: string) {
  const { workspaceId } = await requireWorkspaceAccess();
  const service = await getTagService();
  const result = await service.deleteTag(id, workspaceId);
  if (result.success === false) return { success: false, error: result.error };

  revalidatePath('/contacts/tags');
  revalidatePath('/contacts');
  return { success: true };
}

export async function bulkDeleteTags(ids: string[]) {
  const { workspaceId } = await requireWorkspaceAccess();
  const service = await getTagService();
  const result = await service.bulkDeleteTags(ids, workspaceId);
  if (result.success === false) return { success: false, error: result.error };

  revalidatePath('/contacts/tags');
  revalidatePath('/contacts');
  return { success: true };
}

export async function bulkUpdateTagCategory(ids: string[], categoryId: string | null) {
  const { workspaceId } = await requireWorkspaceAccess();
  const service = await getTagService();
  const result = await service.bulkUpdateCategory(ids, workspaceId, categoryId);
  if (result.success === false) return { success: false, error: result.error };

  revalidatePath('/contacts/tags');
  return { success: true };
}

// ---------- assignment ----------

export async function listTagsForEntity(entityType: TagEntityType, entityId: string) {
  const { workspaceId } = await requireWorkspaceAccess();
  const service = await getTagService();
  const result = await service.listTagsForEntity(entityType, entityId, workspaceId);
  if (result.success === false) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

// Tag-event automation triggers are contact-scoped only — the live automation engine
// (executor.ts's triggerWorkflows) executes workflow steps against a single contactId,
// so company/deal/invoice/course/support_ticket tag events can't be dispatched into it
// without extending that engine's execution model, which is out of scope here.
async function publishTagEvent(eventType: 'tag_added' | 'tag_removed' | 'tag_updated', workspaceId: string, entityType: TagEntityType, entityId: string, tagId: string) {
  if (entityType !== 'contact') return;
  const { publishEvent } = await import('@/lib/events/EventBus');
  publishEvent(workspaceId, eventType, entityId, { tagId }).catch(() => {});
}

export async function assignTag(tagId: string, entityType: TagEntityType, entityId: string) {
  const { workspaceId, userId } = await requireWorkspaceAccess();
  const service = await getTagService();
  const result = await service.assignTag(tagId, entityType, entityId, workspaceId, userId);
  if (result.success === false) return { success: false, error: result.error };

  publishTagEvent('tag_added', workspaceId, entityType, entityId, tagId);
  revalidateEntityPaths(entityType, entityId);
  return { success: true };
}

export async function removeTag(tagId: string, entityType: TagEntityType, entityId: string) {
  const { workspaceId } = await requireWorkspaceAccess();
  const service = await getTagService();
  const result = await service.removeTag(tagId, entityType, entityId, workspaceId);
  if (result.success === false) return { success: false, error: result.error };

  publishTagEvent('tag_removed', workspaceId, entityType, entityId, tagId);
  revalidateEntityPaths(entityType, entityId);
  return { success: true };
}

export async function bulkAssignTags(tagIds: string[], entityType: TagEntityType, entityIds: string[]) {
  const { workspaceId, userId } = await requireWorkspaceAccess();
  const service = await getTagService();
  const result = await service.bulkAssign(tagIds, entityType, entityIds, workspaceId, userId);
  if (result.success === false) return { success: false, error: result.error };

  if (entityType === 'contact') {
    for (const entityId of entityIds) {
      for (const tagId of tagIds) {
        publishTagEvent('tag_added', workspaceId, entityType, entityId, tagId);
      }
    }
  }
  revalidateEntityPaths(entityType);
  return { success: true };
}

export async function bulkRemoveTags(tagIds: string[], entityType: TagEntityType, entityIds: string[]) {
  const { workspaceId } = await requireWorkspaceAccess();
  const service = await getTagService();
  const result = await service.bulkRemove(tagIds, entityType, entityIds, workspaceId);
  if (result.success === false) return { success: false, error: result.error };

  if (entityType === 'contact') {
    for (const entityId of entityIds) {
      for (const tagId of tagIds) {
        publishTagEvent('tag_removed', workspaceId, entityType, entityId, tagId);
      }
    }
  }
  revalidateEntityPaths(entityType);
  return { success: true };
}

// ---------- history ----------

export async function getTagHistory(tagId: string) {
  const { workspaceId } = await requireWorkspaceAccess();
  const service = await getTagService();
  const result = await service.getTagHistory(tagId, workspaceId);
  if (result.success === false) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function getEntityTagHistory(entityType: TagEntityType, entityId: string) {
  const { workspaceId } = await requireWorkspaceAccess();
  const service = await getTagService();
  const result = await service.getEntityHistory(entityType, entityId, workspaceId);
  if (result.success === false) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

// ---------- favorites ----------

export async function toggleFavoriteTag(tagId: string, isFavorite: boolean) {
  const { workspaceId, userId } = await requireWorkspaceAccess();
  const service = await getTagService();
  const result = await service.toggleFavorite(userId, tagId, workspaceId, isFavorite);
  if (result.success === false) return { success: false, error: result.error };

  revalidatePath('/contacts/tags');
  return { success: true };
}
