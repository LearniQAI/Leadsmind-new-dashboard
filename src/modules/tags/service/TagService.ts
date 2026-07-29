import { TagRepository, TagEntityType } from '@/modules/tags/repository/TagRepository';
import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

type Result<T> = { success: true; data: T } | { success: false; error: string };

// Mirrors ContactService's CLIENT_SAFE_CODES convention: only these codes are safe
// to surface verbatim, everything else collapses to a generic message.
const CLIENT_SAFE_CODES = new Set(['TAG_EXISTS', 'CATEGORY_EXISTS', 'VALIDATION_ERROR', 'NOT_FOUND']);

async function toResult<T>(fn: () => Promise<T>, logContext: string): Promise<Result<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (err) {
    if (err instanceof AppError) {
      logger.error({ context: err.context }, `[${logContext}] ${err.code}: ${err.message}`);
      const message = CLIENT_SAFE_CODES.has(err.code) ? err.message : 'Something went wrong. Please try again.';
      return { success: false, error: message };
    }
    logger.error({ err }, `[${logContext}] Unexpected error`);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}

export interface TagWithMeta {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  category_id: string | null;
  visibility: 'private' | 'team' | 'company';
  created_by: string | null;
  tag_type: string;
  parent_tag_id: string | null;
  expires_at: string | null;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
  usage_count: number;
  is_favorite: boolean;
}

export class TagService {
  constructor(private repo: TagRepository) {}

  // ---------- categories ----------

  async listCategories(workspaceId: string) {
    return toResult(() => this.repo.listCategories(workspaceId), 'tags.listCategories');
  }

  async createCategory(workspaceId: string, payload: { name: string; color?: string; icon?: string; sortOrder?: number }) {
    return toResult(async () => {
      if (!payload.name?.trim()) throw new AppError('VALIDATION_ERROR', 'Category name is required', 422);
      return this.repo.createCategory(workspaceId, payload);
    }, 'tags.createCategory');
  }

  async updateCategory(id: string, workspaceId: string, payload: Partial<{ name: string; color: string | null; icon: string | null; sortOrder: number }>) {
    return toResult(() => this.repo.updateCategory(id, workspaceId, payload), 'tags.updateCategory');
  }

  async deleteCategory(id: string, workspaceId: string) {
    return toResult(() => this.repo.deleteCategory(id, workspaceId), 'tags.deleteCategory');
  }

  async reorderCategories(workspaceId: string, orderedIds: string[]) {
    return toResult(() => this.repo.reorderCategories(workspaceId, orderedIds), 'tags.reorderCategories');
  }

  // ---------- tags ----------

  async listTags(workspaceId: string, userId: string): Promise<Result<TagWithMeta[]>> {
    return toResult(async () => {
      const [tags, counts, favorites] = await Promise.all([
        this.repo.listTags(workspaceId),
        this.repo.getTagCounts(workspaceId),
        this.repo.listFavorites(userId, workspaceId),
      ]);
      const favoriteSet = new Set(favorites);
      return tags
        .filter((t) => t.visibility !== 'private' || t.created_by === userId)
        .map((t) => ({
          ...t,
          usage_count: counts.get(t.id) ?? 0,
          is_favorite: favoriteSet.has(t.id),
        }));
    }, 'tags.listTags');
  }

  async searchTags(workspaceId: string, userId: string, query: string) {
    return toResult(async () => {
      const tags = await this.repo.search(workspaceId, query);
      return tags.filter((t) => t.visibility !== 'private' || t.created_by === userId);
    }, 'tags.searchTags');
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
  ) {
    return toResult(async () => {
      if (!payload.name?.trim()) throw new AppError('VALIDATION_ERROR', 'Tag name is required', 422);
      return this.repo.createTag(workspaceId, userId, payload);
    }, 'tags.createTag');
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
  ) {
    return toResult(async () => {
      if (payload.parentTagId && payload.parentTagId === id) {
        throw new AppError('VALIDATION_ERROR', 'A tag cannot be its own parent', 422);
      }
      return this.repo.updateTag(id, workspaceId, payload);
    }, 'tags.updateTag');
  }

  async deleteTag(id: string, workspaceId: string) {
    return toResult(() => this.repo.deleteTag(id, workspaceId), 'tags.deleteTag');
  }

  async bulkDeleteTags(ids: string[], workspaceId: string) {
    return toResult(() => this.repo.bulkDeleteTags(ids, workspaceId), 'tags.bulkDeleteTags');
  }

  async bulkUpdateCategory(ids: string[], workspaceId: string, categoryId: string | null) {
    return toResult(() => this.repo.bulkUpdateCategory(ids, workspaceId, categoryId), 'tags.bulkUpdateCategory');
  }

  // ---------- assignments ----------

  async listTagsForEntity(entityType: TagEntityType, entityId: string, workspaceId: string) {
    return toResult(() => this.repo.listTagsForEntity(entityType, entityId, workspaceId), 'tags.listTagsForEntity');
  }

  async assignTag(tagId: string, entityType: TagEntityType, entityId: string, workspaceId: string, userId: string) {
    return toResult(() => this.repo.assignTag(tagId, entityType, entityId, workspaceId, userId), 'tags.assignTag');
  }

  async removeTag(tagId: string, entityType: TagEntityType, entityId: string, workspaceId: string) {
    return toResult(() => this.repo.removeTag(tagId, entityType, entityId, workspaceId), 'tags.removeTag');
  }

  async bulkAssign(tagIds: string[], entityType: TagEntityType, entityIds: string[], workspaceId: string, userId: string) {
    return toResult(async () => {
      logger.info({ tagCount: tagIds.length, entityCount: entityIds.length, entityType, workspaceId }, 'tags.bulkAssign');
      await this.repo.bulkAssign(tagIds, entityType, entityIds, workspaceId, userId);
    }, 'tags.bulkAssign');
  }

  async bulkRemove(tagIds: string[], entityType: TagEntityType, entityIds: string[], workspaceId: string) {
    return toResult(async () => {
      logger.info({ tagCount: tagIds.length, entityCount: entityIds.length, entityType, workspaceId }, 'tags.bulkRemove');
      await this.repo.bulkRemove(tagIds, entityType, entityIds, workspaceId);
    }, 'tags.bulkRemove');
  }

  // ---------- history ----------

  async getTagHistory(tagId: string, workspaceId: string) {
    return toResult(() => this.repo.getTagHistory(tagId, workspaceId), 'tags.getTagHistory');
  }

  async getEntityHistory(entityType: TagEntityType, entityId: string, workspaceId: string) {
    return toResult(() => this.repo.getEntityHistory(entityType, entityId, workspaceId), 'tags.getEntityHistory');
  }

  // ---------- favorites ----------

  async toggleFavorite(userId: string, tagId: string, workspaceId: string, isFavorite: boolean) {
    return toResult(async () => {
      if (isFavorite) {
        await this.repo.addFavorite(userId, tagId, workspaceId);
      } else {
        await this.repo.removeFavorite(userId, tagId, workspaceId);
      }
    }, 'tags.toggleFavorite');
  }
}
