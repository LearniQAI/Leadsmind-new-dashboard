// Shared by the lesson-quiz and module-quiz reorder routes. The whole rewrite happens inside one Postgres
// function (one transaction); this only validates the payload shape and maps its errors to HTTP statuses.

import type { SupabaseClient } from '@supabase/supabase-js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type QuizScope = 'module' | 'lesson';

export class ReorderError extends Error {
  constructor(public status: 400 | 403 | 404, public code: 'INVALID_IDS' | 'FORBIDDEN' | 'NOT_FOUND', message: string) {
    super(message);
  }
}

export function parseReorderIds(ids: unknown): string[] {
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((i) => typeof i === 'string' && UUID.test(i))) {
    throw new ReorderError(400, 'INVALID_IDS', 'ids must be a non-empty list of question ids');
  }
  return ids as string[];
}

export async function reorderQuizQuestions(
  db: SupabaseClient,
  args: { scope: QuizScope; parentId: string; workspaceId: string; ids: string[] }
): Promise<void> {
  const fn = args.scope === 'module' ? 'reorder_module_quiz_questions' : 'reorder_lesson_quiz_questions';
  const params =
    args.scope === 'module'
      ? { p_quiz_id: args.parentId, p_workspace_id: args.workspaceId, p_ids: args.ids }
      : { p_lesson_id: args.parentId, p_workspace_id: args.workspaceId, p_ids: args.ids };
  const { error } = await db.rpc(fn, params);
  if (!error) return;
  const msg = error.message || '';
  if (msg.includes('REORDER_FORBIDDEN')) throw new ReorderError(403, 'FORBIDDEN', 'One or more questions do not belong to this quiz');
  if (msg.includes('REORDER_NOT_FOUND')) throw new ReorderError(404, 'NOT_FOUND', 'Quiz not found');
  if (msg.includes('REORDER_INVALID')) throw new ReorderError(400, 'INVALID_IDS', msg.replace(/^.*REORDER_INVALID:\s*/, ''));
  throw error;
}
