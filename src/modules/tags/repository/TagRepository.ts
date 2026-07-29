import { AppError, DatabaseError, NotFoundError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export type TagEntityType = 'contact' | 'company' | 'deal' | 'invoice' | 'course' | 'support_ticket';

export interface TagRecord {
  id: string;
  workspace_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  category_id: string | null;
  visibility: 'private' | 'team' | 'company';
  created_by: string | null;
  tag_type: 'manual' | 'ai_smart' | 'automation' | 'temporary' | 'system' | 'relationship';
  parent_tag_id: string | null;
  expires_at: string | null;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface TagCategoryRecord {
  id: string;
  workspace_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export class TagRepository {
  constructor(private db: any) {}

  // ---------- categories ----------

  async listCategories(workspaceId: string): Promise<TagCategoryRecord[]> {
    const { data, error } = await this.db
      .from('tag_categories')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('sort_order', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async createCategory(
    workspaceId: string,
    payload: { name: string; color?: string; icon?: string; sortOrder?: number },
  ): Promise<TagCategoryRecord> {
    const { data, error } = await this.db
      .from('tag_categories')
      .insert({
        workspace_id: workspaceId,
        name: payload.name.trim(),
        color: payload.color ?? null,
        icon: payload.icon ?? null,
        sort_order: payload.sortOrder ?? 0,
      })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') throw new AppError('CATEGORY_EXISTS', 'A category with this name already exists', 409);
      throw new Error(error.message);
    }
    return data;
  }

  async updateCategory(
    id: string,
    workspaceId: string,
    payload: Partial<{ name: string; color: string | null; icon: string | null; sortOrder: number }>,
  ): Promise<TagCategoryRecord> {
    const update: Record<string, unknown> = {};
    if (payload.name !== undefined) update.name = payload.name.trim();
    if (payload.color !== undefined) update.color = payload.color;
    if (payload.icon !== undefined) update.icon = payload.icon;
    if (payload.sortOrder !== undefined) update.sort_order = payload.sortOrder;

    const { data, error } = await this.db
      .from('tag_categories')
      .update(update)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .maybeSingle();
    if (error) {
      if (error.code === '23505') throw new AppError('CATEGORY_EXISTS', 'A category with this name already exists', 409);
      throw new Error(error.message);
    }
    if (!data) throw new NotFoundError('Tag category');
    return data;
  }

  async deleteCategory(id: string, workspaceId: string): Promise<void> {
    const { error } = await this.db.from('tag_categories').delete().eq('id', id).eq('workspace_id', workspaceId);
    if (error) throw new Error(error.message);
  }

  async reorderCategories(workspaceId: string, orderedIds: string[]): Promise<void> {
    // Sequential updates — category counts are small (dozens, not thousands), no RPC needed.
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await this.db
        .from('tag_categories')
        .update({ sort_order: i })
        .eq('id', orderedIds[i])
        .eq('workspace_id', workspaceId);
      if (error) throw new Error(error.message);
    }
  }

  // ---------- tags ----------

  async listTags(workspaceId: string): Promise<TagRecord[]> {
    const { data, error } = await this.db
      .from('tags')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getTagCounts(workspaceId: string): Promise<Map<string, number>> {
    const { data, error } = await this.db
      .from('tag_assignments')
      .select('tag_id')
      .eq('workspace_id', workspaceId);
    if (error) throw new Error(error.message);
    const counts = new Map<string, number>();
    (data ?? []).forEach((row: { tag_id: string }) => {
      counts.set(row.tag_id, (counts.get(row.tag_id) ?? 0) + 1);
    });
    return counts;
  }

  async findById(id: string, workspaceId: string): Promise<TagRecord | null> {
    const { data, error } = await this.db
      .from('tags')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  }

  async search(workspaceId: string, query: string): Promise<TagRecord[]> {
    const { data, error } = await this.db
      .from('tags')
      .select('*')
      .eq('workspace_id', workspaceId)
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async createTag(
    workspaceId: string,
    userId: string,
    payload: {
      name: string;
      color?: string;
      icon?: string;
      categoryId?: string | null;
      visibility?: 'private' | 'team' | 'company';
      parentTagId?: string | null;
      expiresAt?: string | null;
    },
  ): Promise<TagRecord> {
    const { data, error } = await this.db
      .from('tags')
      .insert({
        workspace_id: workspaceId,
        name: payload.name.trim(),
        color: payload.color ?? null,
        icon: payload.icon ?? null,
        category_id: payload.categoryId ?? null,
        visibility: payload.visibility ?? 'team',
        created_by: userId,
        tag_type: 'manual',
        parent_tag_id: payload.parentTagId ?? null,
        expires_at: payload.expiresAt ?? null,
      })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') throw new AppError('TAG_EXISTS', 'A tag with this name already exists', 409);
      throw new Error(error.message);
    }
    return data;
  }

  async updateTag(
    id: string,
    workspaceId: string,
    payload: Partial<{
      name: string;
      color: string | null;
      icon: string | null;
      categoryId: string | null;
      visibility: 'private' | 'team' | 'company';
      parentTagId: string | null;
      expiresAt: string | null;
    }>,
  ): Promise<TagRecord> {
    const update: Record<string, unknown> = {};
    if (payload.name !== undefined) update.name = payload.name.trim();
    if (payload.color !== undefined) update.color = payload.color;
    if (payload.icon !== undefined) update.icon = payload.icon;
    if (payload.categoryId !== undefined) update.category_id = payload.categoryId;
    if (payload.visibility !== undefined) update.visibility = payload.visibility;
    if (payload.parentTagId !== undefined) update.parent_tag_id = payload.parentTagId;
    if (payload.expiresAt !== undefined) update.expires_at = payload.expiresAt;

    const { data, error } = await this.db
      .from('tags')
      .update(update)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .maybeSingle();
    if (error) {
      if (error.code === '23505') throw new AppError('TAG_EXISTS', 'A tag with this name already exists', 409);
      throw new Error(error.message);
    }
    if (!data) throw new NotFoundError('Tag');
    return data;
  }

  async deleteTag(id: string, workspaceId: string): Promise<void> {
    // parent_tag_id has ON DELETE SET NULL, so children are promoted to top-level,
    // not deleted, when their parent is removed.
    const { data, error } = await this.db
      .from('tags')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('id');
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new NotFoundError('Tag');
  }

  async bulkDeleteTags(ids: string[], workspaceId: string): Promise<void> {
    if (ids.length === 0) return;
    const { error } = await this.db.from('tags').delete().eq('workspace_id', workspaceId).in('id', ids);
    if (error) throw new Error(error.message);
  }

  async bulkUpdateCategory(ids: string[], workspaceId: string, categoryId: string | null): Promise<void> {
    if (ids.length === 0) return;
    const { error } = await this.db
      .from('tags')
      .update({ category_id: categoryId })
      .eq('workspace_id', workspaceId)
      .in('id', ids);
    if (error) throw new Error(error.message);
  }

  // ---------- assignments ----------

  async listTagsForEntity(entityType: TagEntityType, entityId: string, workspaceId: string): Promise<TagRecord[]> {
    const { data, error } = await this.db
      .from('tag_assignments')
      .select('tag_id, tags(*)')
      .eq('workspace_id', workspaceId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: { tags: TagRecord }) => row.tags).filter(Boolean);
  }

  async assignTag(
    tagId: string,
    entityType: TagEntityType,
    entityId: string,
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const { error } = await this.db.from('tag_assignments').insert({
      workspace_id: workspaceId,
      tag_id: tagId,
      entity_type: entityType,
      entity_id: entityId,
      assigned_by: userId,
    });
    if (error) {
      if (error.code === '23505') return; // already assigned — idempotent
      logger.error({ err: error, tagId, entityType, entityId, workspaceId }, 'tags.assignTag.failed');
      throw new DatabaseError('Failed to assign tag');
    }
  }

  async removeTag(tagId: string, entityType: TagEntityType, entityId: string, workspaceId: string): Promise<void> {
    const { error } = await this.db
      .from('tag_assignments')
      .delete()
      .eq('tag_id', tagId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('workspace_id', workspaceId);
    if (error) throw new Error(error.message);
  }

  async bulkAssign(
    tagIds: string[],
    entityType: TagEntityType,
    entityIds: string[],
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const rows = tagIds.flatMap((tagId) =>
      entityIds.map((entityId) => ({
        workspace_id: workspaceId,
        tag_id: tagId,
        entity_type: entityType,
        entity_id: entityId,
        assigned_by: userId,
      })),
    );
    if (rows.length === 0) return;
    const { error } = await this.db.from('tag_assignments').upsert(rows, {
      onConflict: 'tag_id,entity_type,entity_id',
      ignoreDuplicates: true,
    });
    if (error) {
      logger.error({ err: error, count: rows.length, workspaceId }, 'tags.bulkAssign.failed');
      throw new DatabaseError('Failed to bulk-assign tags');
    }
  }

  async bulkRemove(
    tagIds: string[],
    entityType: TagEntityType,
    entityIds: string[],
    workspaceId: string,
  ): Promise<void> {
    const { error } = await this.db
      .from('tag_assignments')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('entity_type', entityType)
      .in('tag_id', tagIds)
      .in('entity_id', entityIds);
    if (error) {
      logger.error({ err: error, workspaceId }, 'tags.bulkRemove.failed');
      throw new DatabaseError('Failed to bulk-remove tags');
    }
  }

  // ---------- history ----------

  async getTagHistory(tagId: string, workspaceId: string) {
    const { data, error } = await this.db
      .from('tag_history')
      .select('*')
      .eq('tag_id', tagId)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getEntityHistory(entityType: TagEntityType, entityId: string, workspaceId: string) {
    const { data, error } = await this.db
      .from('tag_history')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  // ---------- favorites ----------

  async listFavorites(userId: string, workspaceId: string): Promise<string[]> {
    const { data, error } = await this.db
      .from('user_tag_favorites')
      .select('tag_id')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: { tag_id: string }) => row.tag_id);
  }

  async addFavorite(userId: string, tagId: string, workspaceId: string): Promise<void> {
    const { error } = await this.db
      .from('user_tag_favorites')
      .upsert({ user_id: userId, tag_id: tagId, workspace_id: workspaceId }, { onConflict: 'user_id,tag_id' });
    if (error) throw new Error(error.message);
  }

  async removeFavorite(userId: string, tagId: string, workspaceId: string): Promise<void> {
    const { error } = await this.db
      .from('user_tag_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('tag_id', tagId)
      .eq('workspace_id', workspaceId);
    if (error) throw new Error(error.message);
  }
}
