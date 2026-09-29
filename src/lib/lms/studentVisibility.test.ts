import { describe, it, expect } from 'vitest';
import { isModuleStudentVisible, filterStudentVisibleLessonIds, whereModuleStudentVisible } from './studentVisibility';

describe('isModuleStudentVisible', () => {
  it('PUBLISHED is visible', () => expect(isModuleStudentVisible({ is_active: true, publish_status: 'published' })).toBe(true));
  it('coming_soon stays visible-but-locked', () => expect(isModuleStudentVisible({ is_active: true, publish_status: 'coming_soon' })).toBe(true));
  it('DRAFT is hidden', () => expect(isModuleStudentVisible({ is_active: true, publish_status: 'draft' })).toBe(false));
  it('INACTIVE is hidden, whatever its publish_status', () => {
    expect(isModuleStudentVisible({ is_active: false, publish_status: 'published' })).toBe(false);
    expect(isModuleStudentVisible({ is_active: false, publish_status: 'coming_soon' })).toBe(false);
  });
  it('null / unknown status fails closed', () => {
    expect(isModuleStudentVisible({ is_active: true, publish_status: null })).toBe(false);
    expect(isModuleStudentVisible({ is_active: true, publish_status: 'archived' })).toBe(false);
  });
});

describe('query helper', () => {
  it('adds is_active and the visible-status list', () => {
    const calls: any[] = [];
    const q: any = { eq: (c: string, v: any) => (calls.push(['eq', c, v]), q), in: (c: string, v: any[]) => (calls.push(['in', c, v]), q) };
    whereModuleStudentVisible(q);
    expect(calls).toEqual([['eq', 'is_active', true], ['in', 'publish_status', ['published', 'coming_soon']]]);
  });
});

describe('filterStudentVisibleLessonIds', () => {
  const db = (rows: any[]) => ({ from: () => ({ select: () => ({ in: async () => ({ data: rows, error: null }) }) }) }) as any;
  it('keeps active lessons in visible modules only', async () => {
    const rows = [
      { id: 'ok', is_active: true, module: { is_active: true, publish_status: 'published' } },
      { id: 'draft', is_active: true, module: { is_active: true, publish_status: 'draft' } },
      { id: 'inactive-module', is_active: true, module: { is_active: false, publish_status: 'published' } },
      { id: 'inactive-lesson', is_active: false, module: { is_active: true, publish_status: 'published' } },
      { id: 'orphan', is_active: true, module: null },
      { id: 'array-embed', is_active: true, module: [{ is_active: true, publish_status: 'coming_soon' }] },
    ];
    expect([...(await filterStudentVisibleLessonIds(db(rows), rows.map((r) => r.id)))].sort()).toEqual(['array-embed', 'ok']);
  });
  it('is empty for no ids without querying', async () => {
    expect((await filterStudentVisibleLessonIds({} as any, [])).size).toBe(0);
  });
});
