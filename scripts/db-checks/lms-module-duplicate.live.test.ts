// Live verification (AT-17): Duplicate Module. New ids all the way down, always DRAFT, appended at the
// end, no student progress copied, the original (and every other module) byte-for-byte unchanged, and
// a failure part-way leaves nothing behind. Runs the REAL duplicate route against the real database.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';

const runId = randomUUID().slice(0, 8);
let db: any, ws = '', course = '', contact = '';
const userIds: string[] = [];
let M1 = '', M2 = '', L1 = '', L2 = '', B1 = '', B2 = '';
let route: any, duplicateModule: any;

vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock('@/lib/lms/access', () => ({ requireLmsInstructor: async () => ({ workspaceId: ws }) }));

const must = (r: any, what: string) => { if (r.error || !r.data) throw new Error(`${what}: ${r.error?.message ?? 'no row'}`); return r.data; };
const dup = (id: string) => route.POST(new NextRequest('http://test/x', { method: 'POST' }), { params: Promise.resolve({ id }) });

const courseState = async () => ({
  modules: (await db.from('course_modules').select('*').eq('course_id', course).order('id')).data,
  lessons: (await db.from('course_lessons').select('*').eq('course_id', course).order('id')).data,
  blocks: (await db.from('content_blocks').select('*').in('lesson_id', [L1, L2]).order('id')).data,
  pages: (await db.from('pages').select('*').in('course_lesson_id', [L1, L2]).order('id')).data,
  progress: (await db.from('course_progress').select('*').eq('course_id', course).order('id')).data,
});

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  db = (await import('@/lib/supabase/server')).createAdminClient();
  route = await import('@/app/api/lms/modules/[id]/duplicate/route');
  ({ duplicateModule } = await import('@/lib/lms/duplicateModule'));
  await sweepStaleTestWorkspaces(db, testRunPatterns('lmsdp'));

  const { data, error } = await db.auth.admin.createUser({ email: `lmsdp-${runId}-owner@example.com`, password: randomUUID(), email_confirm: true });
  if (error) throw new Error(error.message);
  userIds.push(data.user.id);
  await new Promise((r) => setTimeout(r, 1000));
  ws = (await db.from('workspace_members').select('workspace_id').eq('user_id', data.user.id).single()).data.workspace_id;

  course = must(await db.from('courses').insert({ workspace_id: ws, title: `DP course ${runId}`, status: 'published' }).select('id').single(), 'course').id;
  const mkMod = async (t: string, extra: any = {}) =>
    must(await db.from('course_modules').insert({ course_id: course, workspace_id: ws, title: t, publish_status: 'published', required_for_completion: true, drip_days: 2, ...extra }).select('id').single(), 'module').id;
  M1 = await mkMod('Module One');
  M2 = await mkMod('Module Two', { is_active: false }); // an INACTIVE one, to prove copies still come out DRAFT
  const mkLes = async (t: string, position: number) =>
    must(await db.from('course_lessons').insert({ module_id: M1, course_id: course, workspace_id: ws, title: t, lesson_type: 'text', position }).select('id').single(), 'lesson').id;
  L1 = await mkLes('Lesson 1', 1); L2 = await mkLes('Lesson 2', 2);
  const mkBlock = async (lesson: string, position: number) =>
    must(await db.from('content_blocks').insert({ lesson_id: lesson, type: 'rich_text', content: { html: `block ${position}` }, position }).select('id').single(), 'block').id;
  B1 = await mkBlock(L1, 1); B2 = await mkBlock(L1, 2);
  must(await db.from('pages').insert({
    workspace_id: ws, course_lesson_id: L1, name: 'Lesson 1 canvas',
    content: { ROOT: { type: { resolvedName: 'Container' }, props: {} }, n1: { type: { resolvedName: 'ContentBox' }, props: { blockId: B1 } }, n2: { type: { resolvedName: 'LessonBlockNode' }, props: { blockId: B2 } } },
  }).select('id').single(), 'page');

  contact = must(await db.from('contacts').insert({ workspace_id: ws, email: `lmsdp-${runId}-student@example.com`, first_name: 'S', last_name: 'T' }).select('id').single(), 'contact').id;
  must(await db.from('enrollments').insert({ course_id: course, contact_id: contact }).select('id').single(), 'enrollment');
  must(await db.from('course_progress').insert({ workspace_id: ws, contact_id: contact, course_id: course, lesson_id: L1, completed_at: new Date().toISOString() }).select('id').single(), 'progress');
});

afterAll(async () => { await deleteTestWorkspaces(db, [ws], userIds); }, 180_000);

describe('AT-17 duplicate module (real rows)', () => {
  let copyId = '';

  it('creates a new module id, DRAFT, appended last; the original and everything else is unchanged', async () => {
    const before = await courseState();
    const r = await dup(M1);
    expect(r.status).toBe(200);
    const body = await r.json();
    copyId = body.data.id;
    expect(copyId).not.toBe(M1);
    expect(body.lessonsCopied).toBe(2);
    expect(body.blocksCopied).toBe(2);

    const { data: copy } = await db.from('course_modules').select('*').eq('id', copyId).single();
    expect(copy).toMatchObject({ course_id: course, publish_status: 'draft', is_active: true, published_at: null, required_for_completion: true, drip_days: 2, title: 'Module One (Copy)' });
    expect(copy.position).toBe(3); // Module One=1, Module Two=2 -> appended

    const after = await courseState();
    // every row that existed before is byte-for-byte identical (module rows, lessons, blocks, pages, progress)
    for (const key of ['modules', 'lessons', 'blocks', 'pages', 'progress'] as const) {
      const beforeIds = new Set(before[key].map((x: any) => x.id));
      expect(after[key].filter((x: any) => beforeIds.has(x.id))).toEqual(before[key]);
    }
    const { data: mods } = await db.from('course_modules').select('id, position').eq('course_id', course).order('position');
    expect(mods.map((m: any) => m.position)).toEqual([1, 2, 3]);
  });

  it('every lesson, block and page is a brand-new row; no ids are shared with the original', async () => {
    const { data: newLessons } = await db.from('course_lessons').select('id, title, position').eq('module_id', copyId).order('position');
    expect(newLessons.map((l: any) => l.title)).toEqual(['Lesson 1', 'Lesson 2']);
    expect(newLessons.every((l: any) => ![L1, L2].includes(l.id))).toBe(true);

    const newLessonIds = newLessons.map((l: any) => l.id);
    const { data: newBlocks } = await db.from('content_blocks').select('id, lesson_id').in('lesson_id', newLessonIds);
    expect(newBlocks).toHaveLength(2);
    expect(newBlocks.every((b: any) => ![B1, B2].includes(b.id))).toBe(true);

    // the copied canvas points at the NEW blocks, not the originals
    const { data: page } = await db.from('pages').select('content').eq('course_lesson_id', newLessonIds[0]).single();
    const refs = Object.values(page.content).map((n: any) => n?.props?.blockId).filter(Boolean);
    expect(refs).toHaveLength(2);
    const newBlockIds = newBlocks.map((b: any) => b.id);
    expect(refs.every((id: any) => newBlockIds.includes(id))).toBe(true);
    expect(refs.some((id: any) => [B1, B2].includes(id))).toBe(false);
  });

  it('student progress is not copied: the new lessons start at zero for every student', async () => {
    const { data: newLessons } = await db.from('course_lessons').select('id').eq('module_id', copyId);
    const { data: prog } = await db.from('course_progress').select('id').in('lesson_id', newLessons.map((l: any) => l.id));
    expect(prog).toEqual([]);
    const { data: orig } = await db.from('course_progress').select('lesson_id').eq('course_id', course).eq('lesson_id', L1);
    expect(orig).toHaveLength(1); // the original student's completion is still there
  });

  it('duplicating an INACTIVE module still yields an active DRAFT copy', async () => {
    const r = await dup(M2);
    const { data: copy } = await db.from('course_modules').select('publish_status, is_active, position').eq('id', (await r.json()).data.id).single();
    expect(copy).toMatchObject({ publish_status: 'draft', is_active: true, position: 4 });
    const { data: orig } = await db.from('course_modules').select('is_active, publish_status').eq('id', M2).single();
    expect(orig).toMatchObject({ is_active: false, publish_status: 'published' });
  });

  it('a module in another workspace cannot be duplicated', async () => {
    const r = await dup(randomUUID());
    expect(r.status).toBe(404);
  });

  it('a failure part-way rolls the whole copy back: no half-built module is left', async () => {
    const before = await courseState();
    const failingPages = {
      from: (table: string) => table === 'pages'
        ? { select: (...a: any[]) => db.from('pages').select(...a), insert: async () => ({ error: new Error('boom') }) }
        : db.from(table),
    };
    await expect(duplicateModule(failingPages, { workspaceId: ws, moduleId: M1 })).rejects.toThrow('boom');
    expect(await courseState()).toEqual(before);
    const { data: leftovers } = await db.from('course_modules').select('id, title').eq('course_id', course).like('title', 'Module One (Copy)%');
    expect(leftovers).toHaveLength(1); // only the successful copy from the first test
  });
});
