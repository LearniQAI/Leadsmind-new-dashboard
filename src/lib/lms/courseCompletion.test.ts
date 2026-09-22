import { describe, it, expect } from 'vitest';
import { evaluateCourseCompletion, type CompletionInput } from './courseCompletion';

// Course: M1 [L1, L2(lesson quiz)], M2 [L3(assignment)], M2 has a module quiz; M1 has none.
const base = (): CompletionInput => ({
  modules: [
    { id: 'M1', is_active: true, publish_status: 'published' },
    { id: 'M2', is_active: true, publish_status: 'published' },
  ],
  lessons: [
    { id: 'L1', module_id: 'M1', is_active: true },
    { id: 'L2', module_id: 'M1', is_active: true },
    { id: 'L3', module_id: 'M2', is_active: true },
  ],
  completedLessonIds: ['L1', 'L2', 'L3'],
  lessonIdsWithQuiz: ['L2'],
  passedLessonQuizIds: ['L2'],
  moduleIdsWithQuiz: ['M2'],
  passedModuleQuizIds: ['M2'],
  lessonIdsWithAssignment: ['L3'],
  passedAssignmentLessonIds: ['L3'],
});

describe('evaluateCourseCompletion', () => {
  it('everything done -> complete', () => {
    const r = evaluateCourseCompletion(base());
    expect(r.complete).toBe(true);
    expect(r.reason).toBeNull();
    expect(r.totals).toEqual({ lessons: 3, lessonQuizzes: 1, moduleQuizzes: 1, assignments: 1 });
  });

  it('lessons + lesson quizzes done but MODULE quiz skipped -> not complete', () => {
    const r = evaluateCourseCompletion({ ...base(), passedModuleQuizIds: [] });
    expect(r.complete).toBe(false);
    expect(r.missing.moduleQuizzes).toBe(1);
    expect(r.reason).toMatch(/module quizzes/i);
  });

  it('required assignment not graded passed (submitted/pending/failed) -> not complete', () => {
    const r = evaluateCourseCompletion({ ...base(), passedAssignmentLessonIds: [] });
    expect(r.complete).toBe(false);
    expect(r.missing.assignments).toBe(1);
    expect(r.reason).toMatch(/assignment/i);
  });

  it('lesson quiz not passed -> not complete', () => {
    const r = evaluateCourseCompletion({ ...base(), passedLessonQuizIds: [] });
    expect(r.complete).toBe(false);
    expect(r.reason).toMatch(/lesson quizzes/i);
  });

  it('an incomplete lesson -> not complete, with progress in the message', () => {
    const r = evaluateCourseCompletion({ ...base(), completedLessonIds: ['L1', 'L2'] });
    expect(r.complete).toBe(false);
    expect(r.reason).toMatch(/2\/3/);
  });

  it('an INACTIVE lesson the student cannot see is excluded (previously made the certificate unreachable)', () => {
    const input = base();
    input.lessons.push({ id: 'L4', module_id: 'M1', is_active: false });
    const r = evaluateCourseCompletion(input); // L4 never completed
    expect(r.complete).toBe(true);
    expect(r.totals.lessons).toBe(3);
  });

  it('an inactive lesson that carries a quiz/assignment does not block either', () => {
    const input = base();
    input.lessons.push({ id: 'L4', module_id: 'M1', is_active: false });
    input.lessonIdsWithQuiz.push('L4');
    input.lessonIdsWithAssignment.push('L4');
    expect(evaluateCourseCompletion(input).complete).toBe(true);
  });

  it('lessons of an inactive or coming_soon module are excluded, incl. that module\'s quiz', () => {
    const input = base();
    input.modules.push({ id: 'M3', is_active: true, publish_status: 'coming_soon' }, { id: 'M4', is_active: false, publish_status: 'published' });
    input.lessons.push({ id: 'L5', module_id: 'M3', is_active: true }, { id: 'L6', module_id: 'M4', is_active: true });
    input.moduleIdsWithQuiz.push('M3', 'M4');
    const r = evaluateCourseCompletion(input);
    expect(r.complete).toBe(true);
    expect(r.totals).toEqual({ lessons: 3, lessonQuizzes: 1, moduleQuizzes: 1, assignments: 1 });
  });

  it('a draft module is excluded from the requirement (Batch 4 / fix 1), even though it is NOT locked in the player', () => {
    const input = base();
    input.modules.push({ id: 'M3', is_active: true, publish_status: 'draft' });
    input.lessons.push({ id: 'L5', module_id: 'M3', is_active: true });
    // Not completed and still eligible: the draft module never entered the denominator.
    const r = evaluateCourseCompletion(input);
    expect(r.complete).toBe(true);
    expect(r.totals.lessons).toBe(3);
  });

  it('a draft module a student DID finish anyway is not penalized — same totals either way', () => {
    const input = base();
    input.modules.push({ id: 'M3', is_active: true, publish_status: 'draft' });
    input.lessons.push({ id: 'L5', module_id: 'M3', is_active: true });
    const finished = evaluateCourseCompletion({ ...input, completedLessonIds: ['L1', 'L2', 'L3', 'L5'] });
    expect(finished.complete).toBe(true);
    expect(finished.totals.lessons).toBe(3);
  });

  it('a draft module quiz does not gate the certificate either', () => {
    const input = base();
    input.modules.push({ id: 'M3', is_active: true, publish_status: 'draft' });
    input.lessons.push({ id: 'L5', module_id: 'M3', is_active: true });
    input.moduleIdsWithQuiz.push('M3'); // never passed
    expect(evaluateCourseCompletion(input).complete).toBe(true);
  });

  it('a course with no visible lessons cannot yield a certificate', () => {
    const r = evaluateCourseCompletion({ ...base(), lessons: [], completedLessonIds: [] });
    expect(r.complete).toBe(false);
    expect(r.reason).toMatch(/no lessons/i);
  });

  it('a module with no quiz / a lesson with no assignment imposes nothing extra', () => {
    const r = evaluateCourseCompletion({
      ...base(), lessonIdsWithQuiz: [], moduleIdsWithQuiz: [], lessonIdsWithAssignment: [],
      passedLessonQuizIds: [], passedModuleQuizIds: [], passedAssignmentLessonIds: [],
    });
    expect(r.complete).toBe(true);
  });
});
