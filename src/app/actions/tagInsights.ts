'use server';

import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { logger } from '@/shared/logger';
import { findDuplicateTagPairs } from '@/modules/tags/ai/duplicateDetection';
import { findTagConflicts } from '@/modules/tags/ai/conflictDetection';

export async function listDuplicateTagSuggestions() {
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();

  const { data: tags, error } = await supabase.from('tags').select('id, name').eq('workspace_id', workspaceId);
  if (error) {
    logger.error({ err: error, workspaceId }, 'tag_insights.duplicates.fetch_failed');
    return { success: false, error: 'Failed to load tags' };
  }

  return { success: true, data: findDuplicateTagPairs(tags ?? []) };
}

// Merges sourceTagId INTO targetTagId: every assignment moves to the target tag,
// conflicts (entity already has the target tag) are just dropped rather than
// duplicated, then the source tag definition is deleted. Real tag_history entries
// are produced for free by the existing tags/tag_assignments triggers (Part 1) —
// this action doesn't need to write history itself.
export async function mergeTags(sourceTagId: string, targetTagId: string) {
  if (sourceTagId === targetTagId) return { success: false, error: 'Cannot merge a tag into itself' };
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();

  const { data: sourceAssignments, error: fetchErr } = await supabase
    .from('tag_assignments')
    .select('entity_type, entity_id')
    .eq('tag_id', sourceTagId)
    .eq('workspace_id', workspaceId);
  if (fetchErr) return { success: false, error: 'Failed to load source tag assignments' };

  for (const assignment of sourceAssignments ?? []) {
    const { error: insertErr } = await supabase.from('tag_assignments').insert({
      workspace_id: workspaceId,
      tag_id: targetTagId,
      entity_type: assignment.entity_type,
      entity_id: assignment.entity_id,
    });
    if (insertErr && insertErr.code !== '23505') {
      logger.error({ err: insertErr, workspaceId, sourceTagId, targetTagId }, 'tag_insights.merge.reassign_failed');
    }
  }

  const { error: deleteErr } = await supabase.from('tags').delete().eq('id', sourceTagId).eq('workspace_id', workspaceId);
  if (deleteErr) return { success: false, error: 'Failed to remove the merged tag' };

  revalidatePath('/contacts/tags');
  return { success: true };
}

export async function listTagConflicts() {
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('tag_assignments')
    .select('entity_type, entity_id, tag_id, tags(name)')
    .eq('workspace_id', workspaceId);
  if (error) {
    logger.error({ err: error, workspaceId }, 'tag_insights.conflicts.fetch_failed');
    return { success: false, error: 'Failed to load tag assignments' };
  }

  const assignments = (data ?? []).map((row: any) => ({
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    tag_id: row.tag_id,
    tag_name: row.tags?.name ?? '',
  }));

  const conflicts = findTagConflicts(assignments);

  // Every current conflicting pair (Active/Inactive Student, Passed/Failed Quiz) is
  // contact-scoped — resolve display names so the panel doesn't just show raw ids.
  const contactIds = Array.from(new Set(conflicts.filter((c) => c.entityType === 'contact').map((c) => c.entityId)));
  let namesById = new Map<string, string>();
  if (contactIds.length > 0) {
    const { data: contacts } = await supabase.from('contacts').select('id, first_name, last_name').in('id', contactIds);
    namesById = new Map((contacts ?? []).map((c) => [c.id, `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'Unnamed contact']));
  }

  return {
    success: true,
    data: conflicts.map((c) => ({ ...c, entityName: namesById.get(c.entityId) ?? c.entityId })),
  };
}
