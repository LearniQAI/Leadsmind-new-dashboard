import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';
import { waitUntil } from '@vercel/functions';

// contacts.tags (the TEXT[] column) stays the source of truth for the existing
// automation/workflow/segmentation engines per the confirmed Part 1 migration
// strategy — a full repoint of those engines onto tag_assignments was judged
// higher regression risk than the CRUD layer. These helpers mirror array writes
// into the relational tags/tag_assignments model on a best-effort basis so the
// new Tag Manager and cross-module tag_assignments stay accurate. A sync
// failure must never block the primary array write — always caught and logged.

async function ensureTag(supabase: any, workspaceId: string, name: string): Promise<string | undefined> {
  const { data: existing } = await supabase
    .from('tags')
    .select('id')
    .eq('workspace_id', workspaceId)
    .ilike('name', name)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('tags')
    .insert({ workspace_id: workspaceId, name, tag_type: 'manual', visibility: 'team' })
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

  logger.error({ err: error, workspaceId, name }, 'tags.syncContactTags.ensureTag.failed');
  return undefined;
}

/**
 * Reconciles a single contact's relational tag_assignments to match the given
 * full tag-name array (the new state of contacts.tags after a write).
 */
export async function syncContactTagsToRelational(workspaceId: string, contactId: string, tagNames: string[]): Promise<void> {
  // Callers routinely fire this off un-awaited (contacts.ts, lead-workspace.ts,
  // ContactService.ts, etc.) so a slow tag sync never blocks the response. Same
  // failure mode as EventBus.publishEvent (see there): on Vercel, an un-awaited
  // promise can be silently torn down mid-flight when the invocation ends, with
  // nothing ever logged. waitUntil() extends the invocation's lifetime here too,
  // and no-ops safely outside a Vercel request/cron context.
  const p = syncContactTagsToRelationalImpl(workspaceId, contactId, tagNames);
  waitUntil(p);
  return p;
}

async function syncContactTagsToRelationalImpl(workspaceId: string, contactId: string, tagNames: string[]): Promise<void> {
  try {
    const supabase = createAdminClient();
    const cleanNames = Array.from(new Set(tagNames.map((t) => t.trim()).filter(Boolean)));

    const { data: current, error: currentError } = await supabase
      .from('tag_assignments')
      .select('tag_id, tags(name)')
      .eq('workspace_id', workspaceId)
      .eq('entity_type', 'contact')
      .eq('entity_id', contactId);
    if (currentError) throw new Error(currentError.message);

    const currentByLowerName = new Map<string, string>(
      (current ?? [])
        .filter((r: any) => r.tags?.name)
        .map((r: any) => [r.tags.name.toLowerCase(), r.tag_id]),
    );
    const targetLowerNames = new Set(cleanNames.map((n) => n.toLowerCase()));

    for (const [name, tagId] of currentByLowerName.entries()) {
      if (targetLowerNames.has(name)) continue;
      await supabase
        .from('tag_assignments')
        .delete()
        .eq('tag_id', tagId)
        .eq('entity_type', 'contact')
        .eq('entity_id', contactId)
        .eq('workspace_id', workspaceId);
    }

    for (const name of cleanNames) {
      if (currentByLowerName.has(name.toLowerCase())) continue;
      const tagId = await ensureTag(supabase, workspaceId, name);
      if (!tagId) continue;
      const { error: assignError } = await supabase
        .from('tag_assignments')
        .insert({ workspace_id: workspaceId, tag_id: tagId, entity_type: 'contact', entity_id: contactId });
      if (assignError && assignError.code !== '23505') {
        logger.error({ err: assignError, workspaceId, contactId, tagId }, 'tags.syncContactTags.assign.failed');
      }
    }
  } catch (err) {
    logger.error({ err, workspaceId, contactId }, 'tags.syncContactTags.failed');
  }
}

/**
 * Adds one tag to many contacts at once (mirrors bulk_add_tag RPC calls) without
 * needing each contact's full resulting array.
 */
export async function syncBulkContactTagAdd(workspaceId: string, tagName: string, contactIds: string[]): Promise<void> {
  const name = tagName.trim();
  if (!name || contactIds.length === 0) return;
  // See syncContactTagsToRelational above — same un-awaited-on-Vercel risk.
  const p = syncBulkContactTagAddImpl(workspaceId, name, contactIds);
  waitUntil(p);
  return p;
}

async function syncBulkContactTagAddImpl(workspaceId: string, name: string, contactIds: string[]): Promise<void> {
  try {
    const supabase = createAdminClient();
    const tagId = await ensureTag(supabase, workspaceId, name);
    if (!tagId) return;

    const rows = contactIds.map((contactId) => ({
      workspace_id: workspaceId,
      tag_id: tagId,
      entity_type: 'contact',
      entity_id: contactId,
    }));
    const { error } = await supabase.from('tag_assignments').upsert(rows, {
      onConflict: 'tag_id,entity_type,entity_id',
      ignoreDuplicates: true,
    });
    if (error) logger.error({ err: error, workspaceId, tagId }, 'tags.syncBulkContactTagAdd.failed');
  } catch (err) {
    logger.error({ err, workspaceId, tagName: name }, 'tags.syncBulkContactTagAdd.failed');
  }
}

/**
 * Removes one tag from many contacts at once (mirrors bulk_remove_tag RPC calls).
 */
export async function syncBulkContactTagRemove(workspaceId: string, tagName: string, contactIds: string[]): Promise<void> {
  const name = tagName.trim();
  if (!name || contactIds.length === 0) return;
  // See syncContactTagsToRelational above — same un-awaited-on-Vercel risk.
  const p = syncBulkContactTagRemoveImpl(workspaceId, name, contactIds);
  waitUntil(p);
  return p;
}

async function syncBulkContactTagRemoveImpl(workspaceId: string, name: string, contactIds: string[]): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { data: tag } = await supabase
      .from('tags')
      .select('id')
      .eq('workspace_id', workspaceId)
      .ilike('name', name)
      .maybeSingle();
    if (!tag) return;

    const { error } = await supabase
      .from('tag_assignments')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('tag_id', tag.id)
      .eq('entity_type', 'contact')
      .in('entity_id', contactIds);
    if (error) logger.error({ err: error, workspaceId, tagId: tag.id }, 'tags.syncBulkContactTagRemove.failed');
  } catch (err) {
    logger.error({ err, workspaceId, tagName: name }, 'tags.syncBulkContactTagRemove.failed');
  }
}
