import { describe, it, expect } from 'vitest';
import { parseReorderIds, reorderQuizQuestions, ReorderError } from './quizQuestionReorder';

describe('parseReorderIds', () => {
  const uuid = 'a1b2c3d4-e5f6-4789-a012-345678901234';
  it('accepts a non-empty list of uuids', () => expect(parseReorderIds([uuid, uuid.replace('a1', 'b1')])).toHaveLength(2));
  it('rejects empty, non-array, or non-uuid entries', () => {
    for (const bad of [[], 'x', null, undefined, ['not-a-uuid'], [uuid, 123]]) {
      expect(() => parseReorderIds(bad)).toThrow(ReorderError);
    }
  });
});

function stubDb(errorMessage: string | null) {
  const calls: any[] = [];
  return { db: { rpc: async (fn: string, params: any) => { calls.push({ fn, params }); return { error: errorMessage ? { message: errorMessage } : null }; } } as any, calls };
}

describe('reorderQuizQuestions', () => {
  const ids = ['a1b2c3d4-e5f6-4789-a012-345678901234'];

  it('calls the module function with p_quiz_id for scope "module"', async () => {
    const { db, calls } = stubDb(null);
    await reorderQuizQuestions(db, { scope: 'module', parentId: 'quiz1', workspaceId: 'ws1', ids });
    expect(calls[0]).toEqual({ fn: 'reorder_module_quiz_questions', params: { p_quiz_id: 'quiz1', p_workspace_id: 'ws1', p_ids: ids } });
  });

  it('calls the lesson function with p_lesson_id for scope "lesson"', async () => {
    const { db, calls } = stubDb(null);
    await reorderQuizQuestions(db, { scope: 'lesson', parentId: 'lesson1', workspaceId: 'ws1', ids });
    expect(calls[0]).toEqual({ fn: 'reorder_lesson_quiz_questions', params: { p_lesson_id: 'lesson1', p_workspace_id: 'ws1', p_ids: ids } });
  });

  it('maps REORDER_FORBIDDEN / NOT_FOUND / INVALID to the right HTTP status', async () => {
    await expect(reorderQuizQuestions(stubDb('REORDER_FORBIDDEN: nope').db, { scope: 'module', parentId: 'q', workspaceId: 'w', ids })).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    await expect(reorderQuizQuestions(stubDb('REORDER_NOT_FOUND: nope').db, { scope: 'module', parentId: 'q', workspaceId: 'w', ids })).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    await expect(reorderQuizQuestions(stubDb('REORDER_INVALID: bad set').db, { scope: 'module', parentId: 'q', workspaceId: 'w', ids })).rejects.toMatchObject({ status: 400, code: 'INVALID_IDS', message: 'bad set' });
  });

  it('rethrows an unrecognised database error as-is', async () => {
    await expect(reorderQuizQuestions(stubDb('boom').db, { scope: 'module', parentId: 'q', workspaceId: 'w', ids })).rejects.not.toBeInstanceOf(ReorderError);
  });
});
