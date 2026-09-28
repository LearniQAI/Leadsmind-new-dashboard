// Live verification (AT-09, AT-10, AT-11, AT-19): module reorder is atomic, changes position only,
// and the saved order is what students read. Runs the REAL reorder route (and so the real
// reorder_course_modules Postgres function); only session/auth resolution is stubbed.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';

const runId = randomUUID().slice(0, 8);
let db: any, ws = '', course = '', otherCourse = '';
const userIds: string[] = [];
let A = '', B = '', C = '', X = '';
let route: any, modulesRoute: any;

vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock('@/lib/lms/access', () => ({ requireLmsInstructor: async () => ({ workspaceId: ws }) }));

const must = (r: any, what: string) => { if (r.error || !r.data) throw new Error(`${what}: ${r.error?.message ?? "no row"}`); return r.data; };
const req = (url: string, method: string, body?: any) =>
  new NextRequest(`http://test${url}`, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
const call = (cid: string, body: any) =>
  route.PATCH(req(`/api/lms/courses/${cid}/modules/reorder`, 'PATCH', body), { params: Promise.resolve({ courseId: cid }) });
const reorder = (cid: string, ids: string[]) => call(cid, { items: ids.map((moduleId, i) => ({ moduleId, order: i + 1 })) });

// The exact read the student course page performs (student/courses/[id]/page.tsx).
const studentOrder = async () =>
  (await db.from('course_modules').select('id').eq('course_id', course).eq('is_active', true).order('position', { ascending: true })).data.map((m: any) => m.id);
const positions = async () => {
  const { data } = await db.from('course_modules').select('id, position').eq('course_id', course).order('position');
  return data.map((m: any) => `${m.id}:${m.position}`);
};
const fullState = async () => ({
  modules: (await db.from('course_modules').select('id, title, publish_status, is_active, required_for_completion, description').eq('course_id', course).order('id')).data,
  lessons: (await db.from('course_lessons').select('id, module_id, title, position, is_active').eq('course_id', course).order('id')).data,
  progress: (await db.from('course_progress').select('id, contact_id, lesson_id, completed_at').eq('course_id', course).order('id')).data,
});

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  db = (await import('@/lib/supabase/server')).createAdminClient();
  route = await import('@/app/api/lms/courses/[courseId]/modules/reorder/route');
  modulesRoute = await import('@/app/api/lms/modules/route');
  await sweepStaleTestWorkspaces(db, testRunPatterns('lmsro'));

  const { data, error } = await db.auth.admin.createUser({ email: `lmsro-${runId}-owner@example.com`, password: randomUUID(), email_confirm: true });
  if (error) throw new Error(error.message);
  userIds.push(data.user.id);
  await new Promise((r) => setTimeout(r, 1000));
  ws = (await db.from('workspace_members').select('workspace_id').eq('user_id', data.user.id).single()).data.workspace_id;

  course = must(await db.from('courses').insert({ workspace_id: ws, title: `RO course ${runId}`, status: 'published' }).select('id').single(), 'course').id;
  otherCourse = must(await db.from('courses').insert({ workspace_id: ws, title: `RO other ${runId}` }).select('id').single(), 'other course').id;
  const mk = async (cid: string, title: string, pub = 'published') =>
    must(await db.from('course_modules').insert({ course_id: cid, workspace_id: ws, title, publish_status: pub }).select('id').single(), 'module').id;
  A = await mk(course, 'Module A'); B = await mk(course, 'Module B'); C = await mk(course, 'Module C', 'draft');
  X = await mk(otherCourse, 'Foreign module');

  const lessons: string[] = [];
  for (const mid of [A, B, C]) {
    lessons.push(must(await db.from('course_lessons').insert({ module_id: mid, course_id: course, workspace_id: ws, title: `Lesson of ${mid.slice(0, 4)}`, lesson_type: 'text', position: 1 }).select('id').single(), 'lesson').id);
  }
  const contact = must(await db.from('contacts').insert({ workspace_id: ws, email: `lmsro-${runId}-student@example.com`, first_name: 'S', last_name: 'T' }).select('id').single(), 'contact').id;
  const p = await db.from('course_progress').insert({ workspace_id: ws, contact_id: contact, course_id: course, lesson_id: lessons[0] });
  if (p.error) throw new Error(p.error.message);
});

afterAll(async () => { await deleteTestWorkspaces(db, [ws], userIds); }, 180_000);

describe('module reorder (real rows)', () => {
  it('baseline: distinct positions A=1 B=2 C=3', async () => {
    expect(await positions()).toEqual([`${A}:1`, `${B}:2`, `${C}:3`]);
  });

  it('AT-09 move Module B above Module A: order changes; ids, content, progress unchanged', async () => {
    const before = await fullState();
    const r = await reorder(course, [B, A, C]);
    expect(r.status).toBe(200);
    expect(await positions()).toEqual([`${B}:1`, `${A}:2`, `${C}:3`]);
    expect(await fullState()).toEqual(before); // modules (incl. status), lessons, progress; position excluded from the snapshot
  });

  it('AT-10 move Module A below Module B: student-facing sequence follows', async () => {
    await reorder(course, [B, C, A]);
    expect(await studentOrder()).toEqual([B, C, A]);
  });

  it('AT-11 published course: students read the new order, nothing duplicated or missing', async () => {
    await reorder(course, [C, A, B]);
    const seq = await studentOrder();
    expect(seq).toEqual([C, A, B]);
    expect(new Set(seq).size).toBe(3);
    const { data } = await db.from('course_modules').select('position').eq('course_id', course);
    expect(data.map((m: any) => m.position).sort()).toEqual([1, 2, 3]);
  });

  it('AT-19 refresh/reopen: the saved order persists (API list + direct read)', async () => {
    const list = await (await modulesRoute.GET(req(`/api/lms/modules?courseId=${course}`, 'GET'))).json();
    expect(list.data.map((m: any) => m.id)).toEqual([C, A, B]);
    expect(await studentOrder()).toEqual([C, A, B]);
  });

  it('reorder never touches status', async () => {
    const { data } = await db.from('course_modules').select('id, publish_status, is_active').eq('course_id', course);
    const by = Object.fromEntries(data.map((m: any) => [m.id, m]));
    expect(by[C].publish_status).toBe('draft');
    expect(by[A].publish_status).toBe('published');
    expect(by[B].is_active).toBe(true);
  });

  describe('rejected requests change nothing (all-or-nothing)', () => {
    const cases: [string, () => Promise<any>, number][] = [
      ['a module from another course', () => reorder(course, [C, A, X]), 403],
      ['an unknown module id', () => reorder(course, [C, A, randomUUID()]), 403],
      ['a partial set (missing a module)', () => reorder(course, [A, C]), 400],
      ['a duplicate module id', () => reorder(course, [C, C, A]), 400],
      ['orders that are not 1..n', () => call(course, { items: [{ moduleId: C, order: 1 }, { moduleId: A, order: 2 }, { moduleId: B, order: 5 }] }), 400],
      ['a non-uuid moduleId', () => call(course, { items: [{ moduleId: 'nope', order: 1 }] }), 400],
    ];
    for (const [name, run, status] of cases) {
      it(name, async () => {
        const before = await positions();
        const r = await run();
        expect(r.status).toBe(status);
        expect(await positions()).toEqual(before);
      });
    }

    it('another course id cannot reorder these modules', async () => {
      const before = await positions();
      const r = await reorder(otherCourse, [A, B, C]);
      expect(r.status).toBeGreaterThanOrEqual(400);
      expect(await positions()).toEqual(before);
    });
  });

  it('the function is unreachable to anon users (service-role only)', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const before = await positions();
    const { error } = await anon.rpc('reorder_course_modules', { p_course_id: course, p_workspace_id: ws, p_items: [] });
    expect(error).toBeTruthy();
    expect(await positions()).toEqual(before);
  });
});
