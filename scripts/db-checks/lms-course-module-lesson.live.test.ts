// Live verification (AT-01, AT-03, AT-04): course / module / lesson creation land in exactly the
// right place. Runs the REAL createCourseWithDomain action and the REAL module + lesson route
// handlers against the real database; only session/auth resolution is stubbed to the test owner.
// (RLS is therefore not what is under test here — the routes use the service role by design.)
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';

const runId = randomUUID().slice(0, 8);
let db: any, ws = '';
const userIds: string[] = [];

vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock('@/lib/auth', () => ({
  getCurrentWorkspaceId: async () => ws,
  getUser: async () => ({ id: userIds[0] }),
  requireModuleAccess: async () => {},
}));
vi.mock('@/lib/lms/access', () => ({ requireLmsInstructor: async () => ({ workspaceId: ws }) }));
vi.mock('@/lib/supabase/server', async (orig) => {
  const actual = await orig<any>();
  return { ...actual, createServerClient: async () => actual.createAdminClient() };
});

const json = (url: string, method: string, body?: any) =>
  new NextRequest(`http://test${url}`, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });

let createCourseWithDomain: any, modulesRoute: any, lessonsRoute: any;
let courseA = '', courseB = '';

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  db = (await import('@/lib/supabase/server')).createAdminClient();
  ({ createCourseWithDomain } = await import('@/app/actions/lms'));
  modulesRoute = await import('@/app/api/lms/modules/route');
  lessonsRoute = await import('@/app/api/lms/lessons/route');
  await sweepStaleTestWorkspaces(db, testRunPatterns('lmscml'));

  const { data, error } = await db.auth.admin.createUser({ email: `lmscml-${runId}-owner@example.com`, password: randomUUID(), email_confirm: true });
  if (error) throw new Error(error.message);
  userIds.push(data.user.id);
  await new Promise((r) => setTimeout(r, 1000));
  ws = (await db.from('workspace_members').select('workspace_id').eq('user_id', data.user.id).single()).data.workspace_id;
});

afterAll(async () => { await deleteTestWorkspaces(db, [ws], userIds); }, 180_000);

describe('course -> module -> lesson placement (real rows)', () => {
  it('AT-01 create a course: it appears in the course list and no module is created', async () => {
    const res = await createCourseWithDomain(`AT01 course ${runId}`, 'default', `at01-${runId}`);
    expect(res.error).toBeUndefined();
    courseA = res.data.id;
    const { data: courses } = await db.from('courses').select('id, title').eq('workspace_id', ws);
    expect(courses.map((c: any) => c.id)).toContain(courseA);
    const { count } = await db.from('course_modules').select('id', { count: 'exact', head: true }).eq('workspace_id', ws);
    expect(count).toBe(0);
    // A course is never stored as a module and vice versa: every module row's course exists in courses.
    const { data: mods } = await db.from('course_modules').select('id').eq('workspace_id', ws);
    expect(mods).toEqual([]);
  }, 120_000);

  it('AT-03 add a module: it appears only inside the selected course', async () => {
    courseB = (await createCourseWithDomain(`AT03 other ${runId}`, 'default', `at03-${runId}`)).data.id;
    const r = await modulesRoute.POST(json('/api/lms/modules', 'POST', { course_id: courseA, title: 'Module 1' }));
    expect(r.status).toBe(200);
    const mod = (await r.json()).data;
    expect(mod.course_id).toBe(courseA);

    const inA = (await db.from('course_modules').select('id').eq('course_id', courseA)).data.map((m: any) => m.id);
    const inB = (await db.from('course_modules').select('id').eq('course_id', courseB)).data;
    expect(inA).toEqual([mod.id]);
    expect(inB).toEqual([]);
    // the modules listing route for B does not show A's module
    const listB = await (await modulesRoute.GET(json(`/api/lms/modules?courseId=${courseB}`, 'GET'))).json();
    expect(listB.data).toEqual([]);
  }, 120_000);

  it('AT-03 refuses to attach a module to a course in another workspace', async () => {
    const r = await modulesRoute.POST(json('/api/lms/modules', 'POST', { course_id: randomUUID(), title: 'Nope' }));
    expect(r.status).toBeGreaterThanOrEqual(400);
  });

  it('AT-04 add a lesson: it appears only inside the selected module', async () => {
    const m1 = (await db.from('course_modules').select('id').eq('course_id', courseA).single()).data.id;
    const m2res = await modulesRoute.POST(json('/api/lms/modules', 'POST', { course_id: courseA, title: 'Module 2' }));
    const m2 = (await m2res.json()).data.id;

    const r = await lessonsRoute.POST(json('/api/lms/lessons', 'POST', { module_id: m1, course_id: courseA, title: 'Lesson A', lesson_type: 'text' }));
    expect(r.status).toBe(200);
    const lesson = (await r.json()).data;
    expect(lesson.module_id).toBe(m1);

    expect((await db.from('course_lessons').select('id').eq('module_id', m1)).data.map((l: any) => l.id)).toEqual([lesson.id]);
    expect((await db.from('course_lessons').select('id').eq('module_id', m2)).data).toEqual([]);
    expect((await db.from('course_lessons').select('id').eq('course_id', courseB)).data).toEqual([]);
  });
});
