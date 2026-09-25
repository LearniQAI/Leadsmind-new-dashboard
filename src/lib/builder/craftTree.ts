// Craft.js (v0.2.12) serialized trees carry each node's parent twice: implicitly, in the
// parent's `nodes` / `linkedNodes` lists, and explicitly, in the child's own `parent` field.
// `actions.deserialize` copies `parent` verbatim and never rebuilds it — but `actions.delete`
// and `actions.move` both dereference `state.nodes[node.data.parent]`, so a node without it
// throws a TypeError on delete/move (and duplicate/reorder bail out on the empty parentId).
//
// Hand-authored template JSON (lessonTemplates.ts, templates.ts) only lists children and
// omits `parent`, and autosave's query.serialize() then round-trips that omission forever.
// Every tree must pass through here before deserialize: it derives `parent` from the child
// lists, which are the source of truth for rendering. Self-healing — once a repaired tree is
// autosaved, the stored JSON carries correct parents too.
export function withParentLinks(content: string | Record<string, any>): string {
  const tree: Record<string, any> = typeof content === 'string' ? JSON.parse(content) : structuredClone(content);

  for (const [id, node] of Object.entries(tree)) {
    if (!node || typeof node !== 'object') continue;
    for (const childId of Array.isArray(node.nodes) ? node.nodes : []) {
      if (tree[childId]) tree[childId].parent = id;
    }
    for (const linkedId of Object.values(node.linkedNodes || {}) as string[]) {
      if (tree[linkedId]) tree[linkedId].parent = id;
    }
  }

  return JSON.stringify(tree);
}
