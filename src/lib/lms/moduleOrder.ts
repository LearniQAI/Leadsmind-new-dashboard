// Pure ordering helpers for the curriculum reorder UI. Order is expressed as a list of module ids;
// nothing here reads or writes position values except when building the request payload.

export function moveId(ids: string[], from: number, to: number): string[] {
  if (from === to || from < 0 || to < 0 || from >= ids.length || to >= ids.length) return ids;
  const next = ids.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export const moveUp = (ids: string[], id: string) => moveId(ids, ids.indexOf(id), ids.indexOf(id) - 1);
export const moveDown = (ids: string[], id: string) => moveId(ids, ids.indexOf(id), ids.indexOf(id) + 1);

/** Body for PATCH .../modules/reorder — 1-based, complete, identity carried by moduleId never by index. */
export function buildReorderItems(ids: string[]): { moduleId: string; order: number }[] {
  return ids.map((moduleId, i) => ({ moduleId, order: i + 1 }));
}

/** Modules in draft order. Ids in the draft that no longer exist are dropped; modules the draft
 *  doesn't know yet (added since) keep their server order at the end. */
export function applyDraftOrder<T extends { id: string }>(modules: T[], draft: string[] | null): T[] {
  if (!draft) return modules;
  const byId = new Map(modules.map((m) => [m.id, m]));
  const ordered = draft.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
  const seen = new Set(ordered.map((m) => m.id));
  return [...ordered, ...modules.filter((m) => !seen.has(m.id))];
}

export function sameOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}
