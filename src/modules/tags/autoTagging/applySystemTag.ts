import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';
import type { TagEntityType } from '@/modules/tags/repository/TagRepository';

// Defaults for the auto-generated "system" tags this module applies. Real workspaces
// can still recolor/rename them afterward in the Tag Manager — these are just sane
// first-run values, not enforced going forward.
const SYSTEM_TAG_DEFAULTS: Record<string, { color: string; icon?: string }> = {
  'Invoice Overdue': { color: '#ef4444', icon: '⏰' },
  'Outstanding Invoice': { color: '#f59e0b', icon: '💰' },
  'High Value Client': { color: '#8b5cf6', icon: '💎' },
  'Completed Course': { color: '#10b981', icon: '🎓' },
  'Failed Quiz': { color: '#ef4444', icon: '📉' },
  'Passed Quiz': { color: '#10b981', icon: '📈' },
  'Active Student': { color: '#10b981', icon: '⚡' },
  'Inactive Student': { color: '#6b7280', icon: '💤' },
  'Inactive 30 Days': { color: '#6b7280', icon: '💤' },
  'Clicked Campaign': { color: '#3b82f6', icon: '📣' },
  'Frequently Opens Emails': { color: '#3b82f6', icon: '📬' },
  'Lost Deal': { color: '#ef4444', icon: '❌' },
  'Open Ticket': { color: '#f59e0b', icon: '🎫' },
  'Happy Customer': { color: '#10b981', icon: '😊' },
  'Webinar Attendee': { color: '#8b5cf6', icon: '🎥' },
};

async function ensureSystemTag(supabase: any, workspaceId: string, name: string): Promise<string | undefined> {
  const { data: existing } = await supabase
    .from('tags')
    .select('id')
    .eq('workspace_id', workspaceId)
    .ilike('name', name)
    .maybeSingle();
  if (existing) return existing.id;

  const defaults = SYSTEM_TAG_DEFAULTS[name] ?? { color: '#6b7280' };
  const { data: created, error } = await supabase
    .from('tags')
    .insert({
      workspace_id: workspaceId,
      name,
      tag_type: 'system',
      visibility: 'company',
      color: defaults.color,
      icon: defaults.icon ?? null,
    })
    .select('id')
    .single();
  if (!error) return created.id;

  if (error.code === '23505') {
    const { data: retry } = await supabase
      .from('tags')
      .select('id')
      .eq('workspace_id', workspaceId)
      .ilike('name', name)
      .maybeSingle();
    return retry?.id;
  }

  logger.error({ err: error, workspaceId, name }, 'autoTag.ensureSystemTag.failed');
  return undefined;
}

/**
 * Idempotently applies or removes a system-generated tag on an entity, creating the
 * tag definition on first use. Used by every cross-module auto-tagging rule so a
 * condition that stops being true (invoice gets paid, ticket resolved, etc.) also
 * removes the tag, not just adds it.
 */
export async function applyAutoTag(
  workspaceId: string,
  entityType: TagEntityType,
  entityId: string,
  tagName: string,
  shouldHaveTag: boolean,
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const tagId = await ensureSystemTag(supabase, workspaceId, tagName);
    if (!tagId) return;

    if (shouldHaveTag) {
      const { error } = await supabase
        .from('tag_assignments')
        .insert({ workspace_id: workspaceId, tag_id: tagId, entity_type: entityType, entity_id: entityId, assigned_by: null });
      if (error && error.code !== '23505') {
        logger.error({ err: error, workspaceId, tagId, entityType, entityId }, 'autoTag.apply.failed');
      }
    } else {
      const { error } = await supabase
        .from('tag_assignments')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('tag_id', tagId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);
      if (error) logger.error({ err: error, workspaceId, tagId, entityType, entityId }, 'autoTag.remove.failed');
    }
  } catch (err) {
    logger.error({ err, workspaceId, entityType, entityId, tagName }, 'autoTag.applyAutoTag.failed');
  }
}
