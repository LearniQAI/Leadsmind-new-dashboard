// Live verification (AT-12..AT-16): student progress survives module reordering, Continue Learning
// resolves per course and per current order, and courses never affect each other. Real database:
// real enrolments, real course_progress rows, the REAL reorder route (and Postgres function), and the
// same loadCourseResolutions() the student dashboard / portal call.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';

const runId = randomUUID().slice(0, 8);
let db: any, ws = '', contact = '', reorderRoute: any, loadCourseResolutions: any;
const userIds: string[] = [];
let courseA = '', courseB = '';
let mA = '', mB = '', a1 = '', a2 = '', a3 = '', b1 = '', b2 = '', c1 = '', d1 = '';
let mC = '', mD = '';

vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock('@/lib/lms/access', () => ({ requireLmsInstructor: async () => ({ workspaceId: ws }) }));

const must = (r: any, what: string) => { if (r.error || !r.data) throw new Error(`${what}: ${r.error?.message ?? 'no row'}`); return r.data; };
const reorder = (cid: string, ids: string[]) =>
  reorderRoute.PATCH(
    new NextRequest('http://test/x', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: ids.map((moduleId, i) => ({ moduleId, order: i + 1 })) }) }),
    { params: Promise.resolve({ courseId: cid }) }
  );
const resolve = async (course: string) => {
  const { data: enr } = await db.from('enrollments').select('last_lesson_id').eq('contact_id', contact).eq('course_id', course).single();
  return (await loadCourseResolutions(db, { contactIds: [contact], courseIds: [course], lastLessonByCourse: { [course]: enr.last_lesson_id } })).get(course);
};
const complete = (lesson: string, course: string) =>
  db.from('course_progress').insert({ workspace_id: ws, contact_id: contact, course_id: course, lesson_id: lesson, completed_at: new Date().toISOString() });
const setLast = (course: string, lesson: string | null) => db.from('enrollments').update({ last_lesson_id: lesson }).eq('contact_id', contact).eq('course_id', course);

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  db = (await import('@/lib/supabase/server')).createAdminClient();
  reorderRoute = await import('@/app/api/lms/courses/[courseId]/modules/reorder/route');
  ({ loadCourseResolutions } = await import('@/lib/lms/continueLearning'));
  await sweepStaleTestWorkspaces(db, testRunPatterns('lmspr'));

  const { data, error } = await db.auth.admin.createUser({ email: `lmspr-${runId}-owner@example.com`, password: randomUUID(), email_confirm: true });
  if (error) throw new Error(error.message);
  userIds.push(data.user.id);
  await new Promise((r) => setTimeout(r, 1000));
  ws = (await db.from('workspace_members').select('workspace_id').eq('user_id', data.user.id).single()).data.workspace_id;

  const mkCourse = async (t: string) => must(await db.from('courses').insert({ workspace_id: ws, title: `${t} ${runId}`, status: 'published' }).select('id').single(), 'course').id;
  const mkMod = async (course: string, t: string) => must(await db.from('course_modules').insert({ course_id: course, workspace_id: ws, title: t, publish_status: 'published' }).select('id').single(), 'module').id;
  const mkLes = async (course: string, mod: string, t: string, position: number) =>
    must(await db.from('course_lessons').insert({ module_id: mod, course_id: course, workspace_id: ws, title: t, lesson_type: 'text', position }).select('id').single(), 'lesson').id;

  courseA = await mkCourse('PR A'); courseB = await mkCourse('PR B');
  mA = await mkMod(courseA, 'Module A'); mB = await mkMod(courseA, 'Module B');
  a1 = await mkLes(courseA, mA, 'A1', 1); a2 = await mkLes(courseA, mA, 'A2', 2); a3 = await mkLes(courseA, mA, 'A3', 3);
  b1 = await mkLes(courseA, mB, 'B1', 1); b2 = await mkLes(courseA, mB, 'B2', 2);
  mC = await mkMod(courseB, 'Module C'); mD = await mkMod(courseB, 'Module D');
  c1 = await mkLes(courseB, mC, 'C1', 1); d1 = await mkLes(courseB, mD, 'D1', 1);

  contact = must(await db.from('contacts').insert({ workspace_id: ws, email: `lmspr-${runId}-student@example.com`, first_name: 'S', last_name: 'T' }).select('id').single(), 'contact').id;
  for (const c of [courseA, courseB]) must(await db.from('enrollments').insert({ course_id: c, contact_id: contact }).select('id').single(), 'enrollment');
});

afterAll(async () => { await deleteTestWorkspaces(db, [ws], userIds); }, 180_000);

describe('progress + continue learning (real rows)', () => {
  it('AT-15 one student, two courses: one contact, two enrollments, separate progress', async () => {
    const { count } = await db.from('enrollments').select('id', { count: 'exact', head: true }).eq('contact_id', contact);
    expect(count).toBe(2);
    const a = await resolve(courseA), b = await resolve(courseB);
    expect([a.totalLessons, b.totalLessons]).toEqual([5, 2]);
    expect([a.state, b.state]).toEqual(['not_started', 'not_started']);
    expect(a.label).toBe('Not Started');
    expect(a.target?.lessonId).toBe(a1);
  });

  it('AT-14 next lesson follows the right course and its current order (never interleaves modules)', async () => {
    must(await complete(a1, courseA).select('id').single(), 'progress');
    must(await complete(a2, courseA).select('id').single(), 'progress');
    const r = await resolve(courseA);
    expect(r.target?.lessonId).toBe(a3);
    expect(r.label).toBe('40% → Continue at Module 1, Lesson 3');
    // Course B must not be pulled towards course A's lessons
    expect((await resolve(courseB)).target?.lessonId).toBe(c1);
  });

  it('AT-12 reordering Module A from position 1 to 2 keeps A3 complete and the % unchanged', async () => {
    must(await complete(a3, courseA).select('id').single(), 'progress');
    const before = await resolve(courseA);
    expect(before.percentage).toBe(60);
    const { data: progBefore } = await db.from('course_progress').select('id, lesson_id, completed_at').eq('course_id', courseA).order('id');

    const r = await reorder(courseA, [mB, mA]);
    expect(r.status).toBe(200);

    const { data: progAfter } = await db.from('course_progress').select('id, lesson_id, completed_at').eq('course_id', courseA).order('id');
    expect(progAfter).toEqual(progBefore);
    expect(progAfter.map((p: any) => p.lesson_id)).toContain(a3);
    const after = await resolve(courseA);
    expect(after.percentage).toBe(before.percentage);
    expect(after.completedLessons).toBe(before.completedLessons);
    // order really changed: first incomplete is now Module B's first lesson
    expect(after.target?.lessonId).toBe(b1);
    expect(after.label).toBe('60% → Continue at Module 1, Lesson 1');
  });

  it('AT-13 a student part-way through a lesson is not moved off it by a reorder, until they complete it', async () => {
    // Restore original order (A first); student is on B1 (not complete)
    await reorder(courseA, [mA, mB]);
    await setLast(courseA, b1);
    expect((await resolve(courseA)).target?.lessonId).toBe(b1);

    // Instructor moves B behind... A is complete, so put a fresh incomplete lesson first: reorder B before A
    await reorder(courseA, [mB, mA]);
    let r = await resolve(courseA);
    expect(r.target?.lessonId).toBe(b1); // still the in-progress lesson

    // Un-complete nothing; complete B1 -> in-progress lesson is done, navigation now follows the (new) order
    must(await complete(b1, courseA).select('id').single(), 'progress');
    r = await resolve(courseA);
    expect(r.target?.lessonId).toBe(b2);
    expect(r.percentage).toBe(80);
  });

  it('AT-16 completing Course A leaves Course B unchanged', async () => {
    const bBefore = await resolve(courseB);
    must(await complete(b2, courseA).select('id').single(), 'progress');
    const a = await resolve(courseA);
    expect(a.state).toBe('complete');
    expect(a.percentage).toBe(100);
    expect(a.target).toBeNull();
    const bAfter = await resolve(courseB);
    expect(bAfter).toEqual(bBefore);
    expect(bAfter.percentage).toBe(0);
    expect(bAfter.label).toBe('Not Started');
  });

  it('Course B progress counts only Course B lessons; deactivating a module keeps 100% reachable', async () => {
    must(await complete(c1, courseB).select('id').single(), 'progress');
    let b = await resolve(courseB);
    expect(b.percentage).toBe(50);
    expect(b.target?.lessonId).toBe(d1);
    await db.from('course_modules').update({ is_active: false }).eq('id', mD);
    b = await resolve(courseB);
    expect(b.state).toBe('complete');
    expect(b.percentage).toBe(100);
    // Course A untouched by B's change
    expect((await resolve(courseA)).percentage).toBe(100);
  });
});
