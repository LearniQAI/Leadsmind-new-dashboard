// Live verification: DRAFT and INACTIVE modules are hidden from students and the public — in the database
// policies (a real signed-in student and a real anonymous client), in the app read paths, and in the
// server-side action gates. coming_soon stays visible-but-locked. Staff still see everything.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';

const runId = randomUUID().slice(0, 8);
let db: any, ws = '', paid = '', free = '', contact = '';
const userIds: string[] = [];
let studentClient: any, staffClient: any;
const anon = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });

// paid course: pub / draft / inactive / soon      free course: fpub / fdraft
const M: Record<string, string> = {}, L: Record<string, string> = {}, B: Record<string, string> = {};

vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock('@/lib/lms/access', () => ({ requireLmsInstructor: async () => ({ workspaceId: ws }) }));

const must = (r: any, what: string) => { if (r.error || !r.data) throw new Error(`${what}: ${r.error?.message ?? 'no row'}`); return r.data; };
const ids = (rows: any[] | null) => (rows || []).map((r) => r.id).sort();
const sorted = (...keys: string[]) => keys.map((k) => M[k]).sort();

async function signedIn(email: string, password: string) {
  const c = anon();
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in ${email}: ${error.message}`);
  return c;
}

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  db = (await import('@/lib/supabase/server')).createAdminClient();
  await sweepStaleTestWorkspaces(db, testRunPatterns('lmssv'));

  const mkUser = async (tag: string) => {
    const email = `lmssv-${runId}-${tag}@example.com`, password = randomUUID();
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw new Error(error.message);
    userIds.push(data.user.id);
    return { id: data.user.id as string, email, password };
  };
  const staff = await mkUser('staff'); const student = await mkUser('student');
  await new Promise((r) => setTimeout(r, 1200));
  ws = (await db.from('workspace_members').select('workspace_id').eq('user_id', staff.id).single()).data.workspace_id;

  paid = must(await db.from('courses').insert({ workspace_id: ws, title: `SV paid ${runId}`, status: 'published', pricing_model: 'one_time', price: 10 }).select('id').single(), 'paid').id;
  free = must(await db.from('courses').insert({ workspace_id: ws, title: `SV free ${runId}`, status: 'published', pricing_model: 'free', slug: `sv-free-${runId}` }).select('id').single(), 'free').id;

  const mkMod = async (key: string, course: string, publish_status: string, is_active = true) => {
    M[key] = must(await db.from('course_modules').insert({ course_id: course, workspace_id: ws, title: key, publish_status, is_active }).select('id').single(), key).id;
    L[key] = must(await db.from('course_lessons').insert({ module_id: M[key], course_id: course, workspace_id: ws, title: `lesson ${key}`, lesson_type: 'text', position: 1, is_preview: true }).select('id').single(), `lesson ${key}`).id;
    B[key] = must(await db.from('content_blocks').insert({ lesson_id: L[key], type: 'rich_text', content: { html: key }, position: 1 }).select('id').single(), `block ${key}`).id;
  };
  await mkMod('pub', paid, 'published'); await mkMod('draft', paid, 'draft');
  await mkMod('inactive', paid, 'published', false); await mkMod('soon', paid, 'coming_soon');
  await mkMod('fpub', free, 'published'); await mkMod('fdraft', free, 'draft');

  contact = must(await db.from('contacts').insert({ workspace_id: ws, email: student.email, first_name: 'S', last_name: 'T' }).select('id').single(), 'contact').id;
  must(await db.from('enrollments').insert({ course_id: paid, contact_id: contact }).select('id').single(), 'enrollment');
  studentClient = await signedIn(student.email, student.password);
  staffClient = await signedIn(staff.email, staff.password);
});

afterAll(async () => { await deleteTestWorkspaces(db, [ws], userIds); }, 180_000);

describe('database policies (real sessions)', () => {
  it('an enrolled student reads only PUBLISHED and coming_soon modules', async () => {
    const { data } = await studentClient.from('course_modules').select('id').eq('course_id', paid);
    expect(ids(data)).toEqual(sorted('pub', 'soon'));
  });

  it('...only their lessons, and only their content blocks', async () => {
    const { data: lessons } = await studentClient.from('course_lessons').select('id').eq('course_id', paid);
    expect(ids(lessons)).toEqual([L.pub, L.soon].sort());
    const { data: blocks } = await studentClient.from('content_blocks').select('id').in('lesson_id', [L.pub, L.draft, L.inactive, L.soon]);
    expect(ids(blocks)).toEqual([B.pub, B.soon].sort());
  });

  it('a direct read of a DRAFT or INACTIVE lesson by id returns nothing', async () => {
    for (const k of ['draft', 'inactive']) {
      const { data } = await studentClient.from('course_lessons').select('id').eq('id', L[k]);
      expect(data).toEqual([]);
    }
  });

  it('the public (anon key) sees a free published course\'s PUBLISHED module and not its DRAFT one', async () => {
    const { data: mods } = await anon().from('course_modules').select('id').eq('course_id', free);
    expect(ids(mods)).toEqual([M.fpub]);
    const { data: lessons } = await anon().from('course_lessons').select('id').eq('course_id', free);
    expect(ids(lessons)).toEqual([L.fpub]);
  });

  it('staff (workspace members) still see every module', async () => {
    const { data } = await staffClient.from('course_modules').select('id').eq('course_id', paid);
    expect(ids(data)).toEqual(sorted('pub', 'draft', 'inactive', 'soon'));
  });

  it('activating a module makes it appear for the student; deactivating hides it again', async () => {
    await db.from('course_modules').update({ publish_status: 'published' }).eq('id', M.draft);
    expect(ids((await studentClient.from('course_modules').select('id').eq('course_id', paid)).data)).toContain(M.draft);
    await db.from('course_modules').update({ is_active: false }).eq('id', M.draft);
    expect(ids((await studentClient.from('course_modules').select('id').eq('course_id', paid)).data)).not.toContain(M.draft);
    await db.from('course_modules').update({ publish_status: 'draft', is_active: true }).eq('id', M.draft); // restore
  });
});

describe('app read paths and action gates', () => {
  it('progress / Continue Learning ignores DRAFT and INACTIVE modules', async () => {
    const { loadCourseResolutions } = await import('@/lib/lms/continueLearning');
    const r = (await loadCourseResolutions(db, { contactIds: [contact], courseIds: [paid], lastLessonByCourse: { [paid]: L.draft } })).get(paid)!;
    expect(r.totalLessons).toBe(2); // pub + coming_soon
    expect(r.target?.lessonId).toBe(L.pub); // the last-viewed lesson sits in a DRAFT module, so it is not resumed
  });

  it('a student cannot mark a lesson in a DRAFT or INACTIVE module complete', async () => {
    const { markLessonCompleteForContact } = await import('@/lib/lms/completeLesson');
    for (const k of ['draft', 'inactive']) {
      const res = await markLessonCompleteForContact(ws, contact, paid, L[k], { allowIncomplete: true });
      expect(res).toHaveProperty('error');
      const { data } = await db.from('course_progress').select('id').eq('contact_id', contact).eq('lesson_id', L[k]);
      expect(data).toEqual([]);
    }
  });

  it('the pre-enrolment preview never ships a lesson from a DRAFT module, even if flagged is_preview', async () => {
    const { resolveCoursePreview } = await import('@/lib/lms/resolveCoursePreview');
    const prev = await resolveCoursePreview(free, L.fdraft);
    expect(prev!.modules.map((m: any) => m.id)).toEqual([M.fpub]);
    expect(prev!.lessons.map((l: any) => l.id)).toEqual([L.fpub]);
    expect(prev!.activeLesson?.id).not.toBe(L.fdraft);
  });

  it('the public landing curriculum omits DRAFT and INACTIVE modules and their lessons', async () => {
    const { getCourseLandingData } = await import('@/app/actions/courseLanding');
    const res: any = await getCourseLandingData(free);
    expect(res.modules.map((m: any) => m.id)).toEqual([M.fpub]);
    expect(res.lessons.map((l: any) => l.id)).toEqual([L.fpub]);
    const paidRes: any = await getCourseLandingData(paid);
    expect(paidRes.modules.map((m: any) => m.id).sort()).toEqual(sorted('pub', 'soon'));
  });

  it('Phase 6 link: a duplicated module is a DRAFT and is invisible to the student', async () => {
    const dupRoute = await import('@/app/api/lms/modules/[id]/duplicate/route');
    const r = await dupRoute.POST(new NextRequest('http://test/x', { method: 'POST' }), { params: Promise.resolve({ id: M.pub }) });
    expect(r.status).toBe(200);
    const copy = (await r.json()).data;
    expect(copy.publish_status).toBe('draft');
    const { data: seen } = await studentClient.from('course_modules').select('id').eq('id', copy.id);
    expect(seen).toEqual([]);
    const { data: seenLessons } = await studentClient.from('course_lessons').select('id').eq('module_id', copy.id);
    expect(seenLessons).toEqual([]);
    const { loadCourseResolutions } = await import('@/lib/lms/continueLearning');
    expect((await loadCourseResolutions(db, { contactIds: [contact], courseIds: [paid] })).get(paid)!.totalLessons).toBe(2);
  });
});
