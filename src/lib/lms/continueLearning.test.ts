import { describe, it, expect } from 'vitest';
import { orderCourseLessons, resolveContinueLearning } from './continueLearning';

const mod = (id: string, position: number, is_active: boolean | null = true, publish_status: string | null = 'published') => ({ id, position, is_active, publish_status, title: id });
const les = (id: string, module_id: string, position: number, is_active: boolean | null = true) => ({ id, module_id, position, is_active, title: id });

// Lesson positions restart at 1 in every module — exactly the shape that broke lesson-only ordering.
const modules = [mod('M1', 1), mod('M2', 2)];
const lessons = [les('a1', 'M1', 1), les('a2', 'M1', 2), les('a3', 'M1', 3), les('b1', 'M2', 1), les('b2', 'M2', 2)];

describe('orderCourseLessons', () => {
  it('orders by module position then lesson position (never interleaving modules)', () => {
    expect(orderCourseLessons(modules, lessons).map((o) => o.lesson.id)).toEqual(['a1', 'a2', 'a3', 'b1', 'b2']);
  });
  it('follows a module reorder', () => {
    const reordered = [mod('M1', 2), mod('M2', 1)];
    expect(orderCourseLessons(reordered, lessons).map((o) => o.lesson.id)).toEqual(['b1', 'b2', 'a1', 'a2', 'a3']);
  });
  it('numbers modules and lessons for display', () => {
    const o = orderCourseLessons(modules, lessons).find((x) => x.lesson.id === 'b2')!;
    expect([o.moduleNumber, o.lessonNumber]).toEqual([2, 2]);
  });
  it('hides DRAFT and INACTIVE modules from students; coming_soon stays visible (locked)', () => {
    const ids = (mods: any[]) => orderCourseLessons(mods, lessons).map((o) => o.lesson.id);
    expect(ids([mod('M1', 1, true, 'draft'), mod('M2', 2)])).toEqual(['b1', 'b2']);
    expect(ids([mod('M1', 1, true, null), mod('M2', 2)])).toEqual(['b1', 'b2']);
    expect(ids([mod('M1', 1, false, 'published'), mod('M2', 2)])).toEqual(['b1', 'b2']);
    expect(ids([mod('M1', 1, true, 'coming_soon'), mod('M2', 2)])).toEqual(['a1', 'a2', 'a3', 'b1', 'b2']);
  });

  it('progress and the continue target ignore a DRAFT module entirely', () => {
    const r = resolveContinueLearning({ modules: [mod('M1', 1, true, 'draft'), mod('M2', 2)], lessons, completedLessonIds: ['a1', 'b1'], lastLessonId: 'a2' });
    expect(r.totalLessons).toBe(2);
    expect(r.completedLessons).toBe(1); // a1 is in the hidden module and does not count
    expect(r.target?.lessonId).toBe('b2'); // the last-viewed a2 is hidden, so it is not resumed
  });

  it('hides deactivated modules and lessons', () => {
    const ids = orderCourseLessons([mod('M1', 1, false), mod('M2', 2)], [...lessons, les('b3', 'M2', 3, false)]).map((o) => o.lesson.id);
    expect(ids).toEqual(['b1', 'b2']);
  });
});

describe('resolveContinueLearning', () => {
  it('Not Started with zero progress; targets the first lesson', () => {
    const r = resolveContinueLearning({ modules, lessons, completedLessonIds: [] });
    expect(r.state).toBe('not_started');
    expect(r.label).toBe('Not Started');
    expect(r.target?.lessonId).toBe('a1');
    expect(r.percentage).toBe(0);
  });

  it('reports "68% → Continue at Module M, Lesson L" style output', () => {
    const r = resolveContinueLearning({ modules, lessons, completedLessonIds: ['a1', 'a2', 'a3'] });
    expect(r.percentage).toBe(60);
    expect(r.label).toBe('60% → Continue at Module 2, Lesson 1');
  });

  it('targets the first incomplete lesson in current order, including gaps', () => {
    const r = resolveContinueLearning({ modules, lessons, completedLessonIds: ['a1', 'a3'] });
    expect(r.target?.lessonId).toBe('a2');
  });

  it('AT-13: a lesson the student is part-way through is kept after a reorder, until completed', () => {
    const reordered = [mod('M1', 2), mod('M2', 1)]; // M2 now first
    const inProgress = resolveContinueLearning({ modules: reordered, lessons, completedLessonIds: ['a1'], lastLessonId: 'a2' });
    expect(inProgress.target?.lessonId).toBe('a2'); // not moved back to b1
    const afterCompleting = resolveContinueLearning({ modules: reordered, lessons, completedLessonIds: ['a1', 'a2'], lastLessonId: 'a2' });
    expect(afterCompleting.target?.lessonId).toBe('b1'); // now follows the new order
  });

  it('ignores a last lesson that is completed, unknown, hidden or from another course', () => {
    expect(resolveContinueLearning({ modules, lessons, completedLessonIds: ['a1'], lastLessonId: 'a1' }).target?.lessonId).toBe('a2');
    expect(resolveContinueLearning({ modules, lessons, completedLessonIds: [], lastLessonId: 'other-course-lesson' }).target?.lessonId).toBe('a1');
    expect(resolveContinueLearning({ modules: [mod('M1', 1, false), mod('M2', 2)], lessons, completedLessonIds: [], lastLessonId: 'a2' }).target?.lessonId).toBe('b1');
  });

  it('progress percentage is order-independent and ignores foreign completions', () => {
    const done = ['a3', 'zzz-from-another-course'];
    const a = resolveContinueLearning({ modules, lessons, completedLessonIds: done });
    const b = resolveContinueLearning({ modules: [mod('M1', 2), mod('M2', 1)], lessons, completedLessonIds: done });
    expect(a.percentage).toBe(20);
    expect(b.percentage).toBe(20);
    expect(a.completedLessons).toBe(1);
  });

  it('deactivating a module does not make 100% unreachable', () => {
    const r = resolveContinueLearning({ modules: [mod('M1', 1), mod('M2', 2, false)], lessons, completedLessonIds: ['a1', 'a2', 'a3'] });
    expect(r.state).toBe('complete');
    expect(r.percentage).toBe(100);
    expect(r.target).toBeNull();
  });

  it('a course with no visible lessons is Not Started at 0%, never a crash', () => {
    const r = resolveContinueLearning({ modules: [], lessons: [], completedLessonIds: [] });
    expect(r).toMatchObject({ state: 'not_started', percentage: 0, target: null, label: 'Not Started' });
  });
});
