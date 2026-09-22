// Contacts carrying ALL of the given tags, per tag_assignments (the source of truth for tags).
//
// SMS and WhatsApp campaigns used to filter with `contacts.contains('tags', names)`, the LEGACY
// text[] copy on the contact row. That array is a denormalised snapshot that drifts from the real
// relational assignments (a contact tagged through the tag UI, an automation or an import can be
// missing from it, and vice versa), so a tag-targeted send would miss real members and hit stale
// ones -- the same bug already fixed for the Segments "Has tag" rule and sequence goals.
//
// Each entry may be a tag id (uuid) or a tag name (matched case-insensitively, trimmed). Semantics
// are AND, like the array-contains it replaces. A tag that does not exist in this workspace can have
// no members, so the AND is empty (never silently dropped, which would widen the audience).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE = 1000;

async function pageAll(build: (from: number, to: number) => any, what: string): Promise<any[]> {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(`${what} lookup failed: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

export async function resolveTagIds(supabase: any, workspaceId: string, tags: string[]): Promise<string[] | null> {
  const wanted = [...new Set(tags.map((t) => String(t ?? '').trim()).filter(Boolean))];
  if (wanted.length === 0) return [];

  // Only load the workspace's tags when a name has to be resolved.
  const tagRows = await pageAll(
    (from, to) => supabase.from('tags').select('id, name').eq('workspace_id', workspaceId).order('id', { ascending: true }).range(from, to),
    'tag',
  );
  const byId = new Set(tagRows.map((t) => t.id));
  const byName = new Map(tagRows.map((t) => [String(t.name).trim().toLowerCase(), t.id]));

  const ids: string[] = [];
  for (const w of wanted) {
    const id = UUID.test(w) && byId.has(w) ? w : byName.get(w.toLowerCase());
    if (!id) return null; // unknown tag: nobody has it
    ids.push(id);
  }
  return [...new Set(ids)];
}

export async function resolveContactIdsWithAllTags(supabase: any, workspaceId: string, tags: string[]): Promise<Set<string>> {
  const tagIds = await resolveTagIds(supabase, workspaceId, tags);
  if (tagIds === null) return new Set();
  if (tagIds.length === 0) return new Set();

  const assignments = await pageAll(
    (from, to) =>
      supabase.from('tag_assignments').select('entity_id, tag_id')
        .eq('workspace_id', workspaceId).eq('entity_type', 'contact').in('tag_id', tagIds)
        .order('id', { ascending: true }).range(from, to),
    'tag assignment',
  );

  const seen = new Map<string, Set<string>>();
  for (const a of assignments) {
    if (!seen.has(a.entity_id)) seen.set(a.entity_id, new Set());
    seen.get(a.entity_id)!.add(a.tag_id);
  }
  return new Set([...seen.entries()].filter(([, have]) => have.size === tagIds.length).map(([id]) => id));
}
