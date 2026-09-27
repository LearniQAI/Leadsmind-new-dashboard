import type { SupabaseClient } from '@supabase/supabase-js';

// Campaign tag targeting. tag_assignments is the ONLY source of truth for who carries a tag (the
// Tag Manager, Smart Tags and bulk assign write only there); the legacy contacts.tags array is a
// stale one-way mirror and is never consulted. Every read is paginated: PostgREST returns at most
// 1000 rows per request, which previously truncated a 1005-contact tag to 1000 recipients.

const PAGE = 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function pageAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw new Error(error.message ?? String(error));
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

/**
 * Stored campaign tags → current tag ids. Entries are tag ids, or plain tag NAMES on campaigns saved
 * before ids were used (matched case-insensitively; names are unique per workspace). `missing`
 * lists entries whose tag no longer exists — callers refuse to send rather than silently widening
 * or narrowing the audience.
 */
export async function resolveCampaignTagIds(db: SupabaseClient, workspaceId: string, entries: string[]) {
  const tags = await pageAll<{ id: string; name: string }>((from, to) =>
    db.from('tags').select('id, name').eq('workspace_id', workspaceId).order('id').range(from, to));
  const byId = new Set(tags.map((t) => t.id));
  const byName = new Map(tags.map((t) => [t.name.toLowerCase(), t.id]));
  const ids: string[] = [];
  const missing: string[] = [];
  for (const entry of entries) {
    const id = UUID.test(entry) ? (byId.has(entry) ? entry : undefined) : byName.get(entry.trim().toLowerCase());
    if (id) { if (!ids.includes(id)) ids.push(id); } else missing.push(entry);
  }
  return { ids, missing };
}

/** Contacts carrying ALL of `tagIds` (a campaign's multiple tags are an AND), never capped. */
export async function contactIdsWithAllTags(db: SupabaseClient, workspaceId: string, tagIds: string[]): Promise<Set<string>> {
  if (tagIds.length === 0) return new Set();
  const rows = await pageAll<{ entity_id: string; tag_id: string }>((from, to) =>
    db.from('tag_assignments')
      .select('entity_id, tag_id')
      .eq('workspace_id', workspaceId)
      .eq('entity_type', 'contact')
      .in('tag_id', tagIds)
      .order('id')
      .range(from, to));
  const tagsByContact = new Map<string, Set<string>>();
  for (const r of rows) {
    const set = tagsByContact.get(r.entity_id) ?? new Set<string>();
    set.add(r.tag_id);
    tagsByContact.set(r.entity_id, set);
  }
  return new Set([...tagsByContact].filter(([, set]) => set.size === tagIds.length).map(([id]) => id));
}
