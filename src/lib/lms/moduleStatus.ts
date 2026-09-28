// Module lifecycle: DRAFT -> PUBLISHED <-> INACTIVE.
//
// Stored as two independent columns (publish_status + is_active); the lifecycle state is derived
// from them so every student-facing query that filters on is_active keeps working unchanged.
//   INACTIVE  = is_active = false            (a deactivated module, whatever its publish_status)
//   PUBLISHED = publish_status = 'published' AND is_active
//   DRAFT     = everything else (draft / legacy coming_soon, active)
//
// Deactivating keeps publish_status = 'published' so Activate restores the module exactly.

import type { SupabaseClient } from '@supabase/supabase-js';

export type ModuleStatus = 'DRAFT' | 'PUBLISHED' | 'INACTIVE';
export const MODULE_STATUSES: ModuleStatus[] = ['DRAFT', 'PUBLISHED', 'INACTIVE'];

export interface ModuleStatusRow {
  publish_status: string | null;
  is_active: boolean | null;
}

export function deriveModuleStatus(row: ModuleStatusRow): ModuleStatus {
  if (row.is_active === false) return 'INACTIVE';
  return row.publish_status === 'published' ? 'PUBLISHED' : 'DRAFT';
}

const ALLOWED: Record<ModuleStatus, ModuleStatus[]> = {
  DRAFT: ['PUBLISHED'],
  PUBLISHED: ['INACTIVE'],
  INACTIVE: ['PUBLISHED'],
};

export function isValidTransition(from: ModuleStatus, to: ModuleStatus): boolean {
  return ALLOWED[from].includes(to);
}

/** The one lifecycle action offered per state (Add Lesson / Edit / Duplicate / Delete are always offered). */
export function statusActionFor(status: ModuleStatus): { label: string; target: ModuleStatus } {
  if (status === 'DRAFT') return { label: 'Publish', target: 'PUBLISHED' };
  if (status === 'PUBLISHED') return { label: 'Deactivate', target: 'INACTIVE' };
  return { label: 'Activate', target: 'PUBLISHED' };
}

export class ModuleStatusError extends Error {
  constructor(public code: 'NOT_FOUND' | 'INVALID_TRANSITION' | 'CONFLICT' | 'INVALID_STATUS', message: string) {
    super(message);
  }
}

/**
 * Applies a status change to exactly one module. The UPDATE is scoped by
 * id AND course_id AND workspace_id, and is additionally guarded on the status the transition was
 * validated against (compare-and-set), so a concurrent change can never be silently overwritten.
 * A single UPDATE statement is atomic; anything other than exactly one affected row throws.
 */
export async function applyModuleStatus(
  db: SupabaseClient,
  args: { workspaceId: string; courseId: string; moduleId: string; target: string }
) {
  const { workspaceId, courseId, moduleId } = args;
  const target = String(args.target).toUpperCase() as ModuleStatus;
  if (!MODULE_STATUSES.includes(target)) {
    throw new ModuleStatusError('INVALID_STATUS', `status must be one of ${MODULE_STATUSES.join(', ')}`);
  }

  const { data: current, error: readErr } = await db
    .from('course_modules')
    .select('id, publish_status, is_active')
    .eq('id', moduleId)
    .eq('course_id', courseId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!current) throw new ModuleStatusError('NOT_FOUND', 'Module not found in this course');

  const from = deriveModuleStatus(current);
  if (!isValidTransition(from, target)) {
    throw new ModuleStatusError('INVALID_TRANSITION', `Cannot change a ${from} module to ${target}`);
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (target === 'PUBLISHED') {
    patch.publish_status = 'published';
    patch.is_active = true;
    if (from === 'DRAFT') patch.published_at = new Date().toISOString();
  } else {
    patch.is_active = false; // INACTIVE — publish_status untouched so Activate restores it
  }

  let q = db
    .from('course_modules')
    .update(patch)
    .eq('id', moduleId)
    .eq('course_id', courseId)
    .eq('workspace_id', workspaceId);
  q = current.publish_status === null ? q.is('publish_status', null) : q.eq('publish_status', current.publish_status);
  q = current.is_active === null ? q.is('is_active', null) : q.eq('is_active', current.is_active);

  const { data: updated, error } = await q.select('*');
  if (error) throw error;
  if (!updated || updated.length !== 1) {
    // 0 = raced by another change; >1 is impossible (id is the PK) but must never pass silently.
    throw new ModuleStatusError('CONFLICT', `Module status update affected ${updated?.length ?? 0} rows; expected exactly 1`);
  }
  return { module: updated[0], from, to: target };
}
