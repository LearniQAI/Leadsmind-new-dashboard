// Live verification for the acceptance rows that have no other dedicated test:
//   AT-18 delete module, AT-20 tenant isolation, AT-21 domain sharing, AT-22 migration safety.
// Real database, real route handlers / server action; only session resolution is stubbed, and the
// "current workspace" is switchable so one test can act as a DIFFERENT tenant.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';

const runId = randomUUID().slice(0, 8);
let db: any;
let wsA = '', wsB = '', actingAs = '';
const userIds: string[] = [];
let courseA = '', modA1 = '', modA2 = '', modA3 = '', lesA1 = '', lesA2 = '', lesA3 = '', contactA = '';
let courseB = '', modB1 = '';
let impactRoute: any, statusRoute: any, reorderRoute: any, modulesRoute: any, dupRoute: any, lessonsRoute: any, createCourseWithDomain: any;

vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock('@/lib/lms/access', () => ({ requireLmsInstructor: async () => ({ workspaceId: actingAs }) }));
vi.mock('@/lib/auth', () => ({
  getCurrentWorkspaceId: async () => actingAs,
  getUser: async () => ({ id: userIds[0] }),
  requireModuleAccess: async () => {},
}));
vi.mock('@/lib/supabase/server', async (orig) => {
  const actual = await orig<any>();
  return { ...actual, createServerClient: async () => actual.createAdminClient() };
});

const must = (r: any, what: string) => { if (r.error || !r.data) throw new Error(`${what}: ${r.error?.message ?? 'no row'}`); return r.data; };
const req = (url: string, method: string, body?: any) =>
  new NextRequest(`http://test${url}`, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });

const tenantAState = async () => ({
  modules: (await db.from('course_modules').select('*').eq('workspace_id', wsA).order('id')).data,
  lessons: (await db.from('course_lessons').select('*').eq('workspace_id', wsA).order('id')).data,
  courses: (await db.from('courses').select('*').eq('workspace_id', wsA).order('id')).data,
  progress: (await db.from('course_progress').select('*').eq('workspace_id', wsA).order('id')).data,
});

async function mkOwner(tag: string) {
  const { data, error } = await db.auth.admin.createUser({ email: `lmsar-${runId}-${tag}@example.com`, password: randomUUID(), email_confirm: true });
  if (error) throw new Error(error.message);
  userIds.push(data.user.id);
  await new Promise((r) => setTimeout(r, 1000));
  return (await db.from('workspace_members').select('workspace_id').eq('user_id', data.user.id).single()).data.workspace_id as string;
}

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  db = (await import('@/lib/supabase/server')).createAdminClient();
  statusRoute = await import('@/app/api/lms/courses/[courseId]/modules/[moduleId]/route');
  reorderRoute = await import('@/app/api/lms/courses/[courseId]/modules/reorder/route');
  modulesRoute = await import('@/app/api/lms/modules/route');
  dupRoute = await import('@/app/api/lms/modules/[id]/duplicate/route');
  impactRoute = await import('@/app/api/lms/modules/[id]/impact/route');
  lessonsRoute = await import('@/app/api/lms/lessons/route');
  ({ createCourseWithDomain } = await import('@/app/actions/lms'));
  await sweepStaleTestWorkspaces(db, testRunPatterns('lmsar'));

  wsA = await mkOwner('a'); wsB = await mkOwner('b');
  courseA = must(await db.from('courses').insert({ workspace_id: wsA, title: `AR A ${runId}`, status: 'published' }).select('id').single(), 'course A').id;
  courseB = must(await db.from('courses').insert({ workspace_id: wsB, title: `AR B ${runId}`, status: 'published' }).select('id').single(), 'course B').id;
  const mkMod = async (ws: string, c: string, t: string, pub = 'published') =>
    must(await db.from('course_modules').insert({ course_id: c, workspace_id: ws, title: t, publish_status: pub }).select('id').single(), 'module').id;
  modA1 = await mkMod(wsA, courseA, 'A1'); modA2 = await mkMod(wsA, courseA, 'A2'); modA3 = await mkMod(wsA, courseA, 'A3', 'draft');
  modB1 = await mkMod(wsB, courseB, 'B1');
  const mkLes = async (ws: string, c: string, m: string, t: string) =>
    must(await db.from('course_lessons').insert({ module_id: m, course_id: c, workspace_id: ws, title: t, lesson_type: 'text', position: 1 }).select('id').single(), 'lesson').id;
  lesA1 = await mkLes(wsA, courseA, modA1, 'LA1'); lesA2 = await mkLes(wsA, courseA, modA2, 'LA2'); lesA3 = await mkLes(wsA, courseA, modA3, 'LA3');
  contactA = must(await db.from('contacts').insert({ workspace_id: wsA, email: `lmsar-${runId}-student@example.com`, first_name: 'S', last_name: 'T' }).select('id').single(), 'contact').id;
  must(await db.from('enrollments').insert({ course_id: courseA, contact_id: contactA }).select('id').single(), 'enrollment');
  for (const l of [lesA1, lesA2]) must(await db.from('course_progress').insert({ workspace_id: wsA, contact_id: contactA, course_id: courseA, lesson_id: l, completed_at: new Date().toISOString() }).select('id').single(), 'progress');
});

afterAll(async () => { await deleteTestWorkspaces(db, [wsA, wsB], userIds); }, 180_000);

describe('AT-20 tenant isolation: workspace B cannot touch workspace A', () => {
  it('every module mutation aimed at A while acting as B is refused and changes nothing', async () => {
    actingAs = wsB;
    const before = await tenantAState();

    const status = await statusRoute.PATCH(req('/x', 'PATCH', { status: 'INACTIVE' }), { params: Promise.resolve({ courseId: courseA, moduleId: modA1 }) });
    expect(status.status).toBe(404);

    const reorder = await reorderRoute.PATCH(req('/x', 'PATCH', { items: [{ moduleId: modA2, order: 1 }, { moduleId: modA1, order: 2 }, { moduleId: modA3, order: 3 }] }), { params: Promise.resolve({ courseId: courseA }) });
    expect(reorder.status).toBeGreaterThanOrEqual(400);

    const patch = await modulesRoute.PATCH(req(`/api/lms/modules?id=${modA1}`, 'PATCH', { title: 'hijacked', is_active: false, position: 9 }));
    expect(patch.status).toBeGreaterThanOrEqual(400);

    const del = await modulesRoute.DELETE(req(`/api/lms/modules?id=${modA1}`, 'DELETE'));
    expect(del.status).toBe(404); // a rejected delete never reports success
    const dup = await dupRoute.POST(req('/x', 'POST'), { params: Promise.resolve({ id: modA1 }) });
    expect(dup.status).toBe(404);
    const impact = await impactRoute.GET(req('/x', 'GET'), { params: Promise.resolve({ id: modA1 }) });
    expect(impact.status).toBe(404); // and the impact lookup does not leak another tenant's counts

    const addModule = await modulesRoute.POST(req('/api/lms/modules', 'POST', { course_id: courseA, title: 'injected' }));
    expect(addModule.status).toBe(403);
    const addLesson = await lessonsRoute.POST(req('/api/lms/lessons', 'POST', { module_id: modA1, course_id: courseA, title: 'injected', lesson_type: 'text' }));
    expect(addLesson.status).toBeGreaterThanOrEqual(400);

    // ... and the proof that matters: workspace A's data is byte-for-byte identical
    expect(await tenantAState()).toEqual(before);
    actingAs = wsA;
  });

  it('RLS: a signed-in user of workspace B cannot read or write workspace A modules directly', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const email = `lmsar-${runId}-b@example.com`;
    const pw = randomUUID();
    const { data: u } = await db.auth.admin.listUsers();
    const bUser = u.users.find((x: any) => x.email === email);
    await db.auth.admin.updateUserById(bUser.id, { password: pw });
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const { error: signErr } = await client.auth.signInWithPassword({ email, password: pw });
    expect(signErr).toBeNull();

    // A published FREE course is publicly readable by design ("public read free course_modules"), so make A a
    // paid course: its modules must then be invisible to another tenant.
    await db.from('courses').update({ pricing_model: 'one_time', price: 50 }).eq('id', courseA);
    const before = await tenantAState();
    const read = await client.from('course_modules').select('id').eq('course_id', courseA);
    expect(read.data ?? []).toEqual([]);
    await client.from('course_modules').update({ title: 'hijacked' }).eq('id', modA1);
    await client.from('course_modules').delete().eq('id', modA1);
    expect(await tenantAState()).toEqual(before);
  });
});

describe('AT-18 delete module: other modules keep their state, order and data', () => {
  it('deleting one module removes only it; siblings, their lessons and progress are untouched; reordering still works after', async () => {
    actingAs = wsA;
    const others = async () => ({
      modules: (await db.from('course_modules').select('*').in('id', [modA1, modA3]).order('id')).data,
      lessons: (await db.from('course_lessons').select('*').in('module_id', [modA1, modA3]).order('id')).data,
      progress: (await db.from('course_progress').select('*').eq('lesson_id', lesA1)).data,
    });
    const before = await others();
    const { data: posBefore } = await db.from('course_modules').select('id, position').eq('course_id', courseA).order('position');
    expect(posBefore.map((m: any) => m.id)).toEqual([modA1, modA2, modA3]);

    // modA2 holds a student's progress: the delete is refused until the stakes are confirmed (not a hard block)
    const refused = await modulesRoute.DELETE(req(`/api/lms/modules?id=${modA2}`, 'DELETE'));
    expect(refused.status).toBe(409);
    const refusedBody = await refused.json();
    expect(refusedBody.code).toBe('PROGRESS_WOULD_BE_LOST');
    expect(refusedBody.impact).toMatchObject({ lessons: 1, students: 1, progressRows: 1 });
    expect((await db.from('course_modules').select('id').eq('id', modA2)).data).toHaveLength(1); // nothing was deleted
    expect(await others()).toEqual(before);

    const r = await modulesRoute.DELETE(req(`/api/lms/modules?id=${modA2}&confirmProgressLoss=true`, 'DELETE'));
    expect(r.status).toBe(200);

    expect((await db.from('course_modules').select('id').eq('id', modA2)).data).toEqual([]);
    expect((await db.from('course_lessons').select('id').eq('module_id', modA2)).data).toEqual([]);
    expect(await others()).toEqual(before);

    // relative order preserved (a gap in position is fine) and statuses intact
    const { data: posAfter } = await db.from('course_modules').select('id, position, publish_status').eq('course_id', courseA).order('position');
    expect(posAfter.map((m: any) => m.id)).toEqual([modA1, modA3]);
    expect(posAfter.map((m: any) => m.publish_status)).toEqual(['published', 'draft']);

    // the reorder function still accepts the surviving modules despite the position gap
    const re = await reorderRoute.PATCH(req('/x', 'PATCH', { items: [{ moduleId: modA3, order: 1 }, { moduleId: modA1, order: 2 }] }), { params: Promise.resolve({ courseId: courseA }) });
    expect(re.status).toBe(200);
    const { data: posFinal } = await db.from('course_modules').select('id, position').eq('course_id', courseA).order('position');
    expect(posFinal).toEqual([{ id: modA3, position: 1 }, { id: modA1, position: 2 }]);
  });
});

describe('lifecycle and order funnel through their one validated path', () => {
  let m = '';
  it('POST always creates a DRAFT, even when the caller asks for published', async () => {
    actingAs = wsA;
    const r = await modulesRoute.POST(req('/api/lms/modules', 'POST', { course_id: courseA, title: 'sneaky', publish_status: 'published', is_active: false }));
    expect(r.status).toBe(200);
    m = (await r.json()).data.id;
    const { data } = await db.from('course_modules').select('publish_status, is_active, published_at').eq('id', m).single();
    expect(data).toEqual({ publish_status: 'draft', is_active: true, published_at: null });
  });

  it('the legacy PATCH refuses status, active and position changes and changes nothing', async () => {
    const before = (await db.from('course_modules').select('*').eq('id', m).single()).data;
    for (const [body, code] of [
      [{ publish_status: 'published' }, 'USE_STATUS_ENDPOINT'],
      [{ is_active: false }, 'USE_STATUS_ENDPOINT'],
      [{ title: 'renamed', publish_status: 'published' }, 'USE_STATUS_ENDPOINT'], // no partial application
      [{ position: 1 }, 'USE_REORDER_ENDPOINT'],
    ] as const) {
      const r = await modulesRoute.PATCH(req(`/api/lms/modules?id=${m}`, 'PATCH', body));
      expect(r.status).toBe(400);
      expect((await r.json()).code).toBe(code);
    }
    expect((await db.from('course_modules').select('*').eq('id', m).single()).data).toEqual(before);
  });

  it('the legacy PATCH still edits content settings', async () => {
    const r = await modulesRoute.PATCH(req(`/api/lms/modules?id=${m}`, 'PATCH', { title: 'renamed ok', required_for_completion: false }));
    expect(r.status).toBe(200);
    const { data } = await db.from('course_modules').select('title, required_for_completion, publish_status').eq('id', m).single();
    expect(data).toEqual({ title: 'renamed ok', required_for_completion: false, publish_status: 'draft' });
  });

  it('the only route that can publish it is the validated status endpoint', async () => {
    const r = await statusRoute.PATCH(req('/x', 'PATCH', { status: 'PUBLISHED' }), { params: Promise.resolve({ courseId: courseA, moduleId: m }) });
    expect(r.status).toBe(200);
    expect((await db.from('course_modules').select('publish_status, published_at').eq('id', m).single()).data.published_at).toBeTruthy();
  });

  it('deleting a module nobody has progress in needs no confirmation; the impact endpoint says so', async () => {
    const imp = await (await impactRoute.GET(req('/x', 'GET'), { params: Promise.resolve({ id: m }) })).json();
    expect(imp.data).toMatchObject({ lessons: 0, students: 0, progressRows: 0 });
    const r = await modulesRoute.DELETE(req(`/api/lms/modules?id=${m}`, 'DELETE'));
    expect(r.status).toBe(200);
    expect((await db.from('course_modules').select('id').eq('id', m)).data).toEqual([]);
  });

  it('deleting a module that does not exist is a 404, not a success', async () => {
    const r = await modulesRoute.DELETE(req(`/api/lms/modules?id=${randomUUID()}`, 'DELETE'));
    expect(r.status).toBe(404);
  });
});

describe('AT-21 domain sharing: several courses on one Learning Site/Domain', () => {
  it('two courses share one domain with different paths, and one student account enrolls in both', async () => {
    actingAs = wsA;
    const domainId = must(await db.from('domain_configurations').insert({ workspace_id: wsA, hostname: `lms-${runId}.example.com`, status: 'active' }).select('id').single(), 'domain').id;

    const one = await createCourseWithDomain(`AR dom one ${runId}`, domainId, `one-${runId}`);
    const two = await createCourseWithDomain(`AR dom two ${runId}`, domainId, `two-${runId}`);
    expect(one.error).toBeUndefined();
    expect(two.error).toBeUndefined();
    expect(one.data.domain_id).toBe(domainId);
    expect(two.data.domain_id).toBe(domainId);
    expect(one.data.id).not.toBe(two.data.id);

    // same path on the same domain is rejected by the database itself
    const clash = await createCourseWithDomain(`AR dom three ${runId}`, domainId, `one-${runId}`);
    expect(clash.error).toMatch(/already/i);

    // one student account (contact) can be enrolled in both — no per-course/per-domain account
    for (const c of [one.data.id, two.data.id]) must(await db.from('enrollments').insert({ course_id: c, contact_id: contactA }).select('id').single(), 'enroll');
    const { count: contacts } = await db.from('contacts').select('id', { count: 'exact', head: true }).eq('email', `lmsar-${runId}-student@example.com`);
    expect(contacts).toBe(1);
    const { count: enrollments } = await db.from('enrollments').select('id', { count: 'exact', head: true }).eq('contact_id', contactA).in('course_id', [one.data.id, two.data.id]);
    expect(enrollments).toBe(2);
  }, 240_000);
});

describe('AT-22 migration safety (read-only, against production data)', () => {
  it('the pre-migration snapshot exists and every backed-up module still exists, unmoved', async () => {
    const { data: bak, error } = await db.from('_bak_course_modules_20260928').select('id, course_id, title, workspace_id');
    expect(error).toBeNull();
    expect(bak.length).toBeGreaterThanOrEqual(9);
    const { data: live } = await db.from('course_modules').select('id, course_id, title, workspace_id').in('id', bak.map((b: any) => b.id));
    const byId = new Map(live.map((m: any) => [m.id, m]));
    for (const b of bak) expect(byId.get(b.id)).toEqual(b); // nothing deleted, re-parented or renamed
  });

  it('the accidental "Module 2" is a module inside the TEFL course — no standalone course, none deleted or archived', async () => {
    const { data: asCourse } = await db.from('courses').select('id').ilike('title', '%Managing Large%');
    expect(asCourse).toEqual([]);
    const { data: mod } = await db.from('course_modules').select('id, course_id, publish_status').eq('id', '3b5b2f2c-043f-4fc3-a464-45aeda3fe825').single();
    expect(mod.course_id).toBe('3c11ad48-5b17-4faa-b1fc-934bd1fc8812');
    const { data: archived } = await db.from('courses').select('id').not('archived_at', 'is', null);
    expect(archived).toEqual([]);
  });

  it('the seeded production data was not lost (Phase 0 counts still hold)', async () => {
    const count = async (t: string) => (await db.from(t).select('id', { count: 'exact', head: true })).count as number;
    // Phase 0 (before any change): 17 courses, 9 modules, 21 lessons, 27 enrollments, 1 course_progress.
    // Other tenants' real activity can only add rows; a loss shows as a count below the baseline.
    expect(await count('courses')).toBeGreaterThanOrEqual(17);
    expect(await count('course_modules')).toBeGreaterThanOrEqual(9);
    expect(await count('course_lessons')).toBeGreaterThanOrEqual(21);
    expect(await count('enrollments')).toBeGreaterThanOrEqual(27);
    expect(await count('course_progress')).toBeGreaterThanOrEqual(1);
  });
});
