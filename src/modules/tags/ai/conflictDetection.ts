// Conflicting-tag detection: a fixed table of known-mutually-exclusive tag name
// pairs, checked against real tag_assignments. Deterministic and explainable rather
// than an LLM guess — the pairs below are exactly the ones this codebase's own
// auto-tagging rules treat as opposites (see applySystemTag.ts call sites).
export const CONFLICTING_TAG_PAIRS: [string, string][] = [
  ['Active Student', 'Inactive Student'],
  ['Passed Quiz', 'Failed Quiz'],
];

export interface TagConflict {
  entityType: string;
  entityId: string;
  tagA: { id: string; name: string };
  tagB: { id: string; name: string };
}

/**
 * Given every tag_assignment row (with its tag name) for a workspace, finds any
 * entity that currently carries both tags of a known-conflicting pair — this can
 * happen when tags are applied manually, since the auto-tagging rules themselves
 * never apply both sides of a pair to the same entity.
 */
export function findTagConflicts(
  assignments: { entity_type: string; entity_id: string; tag_id: string; tag_name: string }[],
): TagConflict[] {
  const byEntity = new Map<string, { entityType: string; entityId: string; tags: { id: string; name: string }[] }>();
  assignments.forEach((a) => {
    const key = `${a.entity_type}:${a.entity_id}`;
    if (!byEntity.has(key)) byEntity.set(key, { entityType: a.entity_type, entityId: a.entity_id, tags: [] });
    byEntity.get(key)!.tags.push({ id: a.tag_id, name: a.tag_name });
  });

  const conflicts: TagConflict[] = [];
  for (const { entityType, entityId, tags } of byEntity.values()) {
    for (const [nameA, nameB] of CONFLICTING_TAG_PAIRS) {
      const tagA = tags.find((t) => t.name === nameA);
      const tagB = tags.find((t) => t.name === nameB);
      if (tagA && tagB) {
        conflicts.push({ entityType, entityId, tagA, tagB });
      }
    }
  }
  return conflicts;
}
