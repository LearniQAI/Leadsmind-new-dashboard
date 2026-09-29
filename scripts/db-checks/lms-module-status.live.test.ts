// Live verification (AT-05..AT-08): module status changes touch exactly one module. Every assertion
// reads the REAL database row per module id after each mutation — never a UI badge.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';

const runId = randomUUID().slice(0, 8);
let db: any, ws = '', courseId = '', otherCourseId = '';
const userIds: string[] = [];
let m1 = '', m2 = '', m3 = '', other = '';
let applyModuleStatus: any;

const snap = async () => {
  const { data } = await db.from('course_modules').select('id, publish_status, is_active, position, title, course_id, required_for_completion').in('id', [m1, m2, m3, other]);
  return Object.fromEntries(data.map((r: any) => [r.id, r]));
};
const st = (r: any) => (r.is_active === false ? 'INACTIVE' : r.publish_status === 'published' ? 'PUBLISHED' : 'DRAFT');
const go = (id: string, target: string, cid = courseId) => applyModuleStatus(db, { workspaceId: ws, courseId: cid, moduleId: id, target });

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  db = (await import('@/lib/supabase/server')).createAdminClient();
  ({ applyModuleStatus } = await import('@/lib/lms/moduleStatus'));
  await sweepStaleTestWorkspaces(db, testRunPatterns('lmsms'));

  const email = `lmsms-${runId}-owner@example.com`;
  const { data, error } = await db.auth.admin.createUser({ email, password: randomUUID(), email_confirm: true });
  if (error) throw new Error(error.message);
  userIds.push(data.user.id);
  await new Promise((r) => setTimeout(r, 1000));
  ws = (await db.from('workspace_members').select('workspace_id').eq('user_id', data.user.id).single()).data.workspace_id;

  courseId = (await db.from('courses').insert({ workspace_id: ws, title: `AT course ${runId}` }).select('id').single()).data.id;
  otherCourseId = (await db.from('courses').insert({ workspace_id: ws, title: `AT other ${runId}` }).select('id').single()).data.id;
  const mk = async (cid: string, title: string, publish_status: string, is_active = true, required = true) =>
    (await db.from('course_modules').insert({ course_id: cid, workspace_id: ws, title, publish_status, is_active, required_for_completion: required }).select('id').single()).data.id;
  m1 = await mk(courseId, 'Module 1', 'published');
  m2 = await mk(courseId, 'Module 2', 'draft');
  m3 = await mk(courseId, 'Module 3', 'published', false, false);
  other = await mk(otherCourseId, 'Other course module', 'draft');
});

afterAll(async () => { await deleteTestWorkspaces(db, [ws], userIds); }, 180_000);

describe('module status isolation (real rows)', () => {
  it('trigger gave the three modules distinct positions 1..3 (Phase 1 guard)', async () => {
    const s = await snap();
    expect([s[m1].position, s[m2].position, s[m3].position]).toEqual([1, 2, 3]);
    expect(s[other].position).toBe(1);
  });

  it('AT-08 baseline: DRAFT, PUBLISHED, INACTIVE coexist', async () => {
    const s = await snap();
    expect([st(s[m1]), st(s[m2]), st(s[m3])]).toEqual(['PUBLISHED', 'DRAFT', 'INACTIVE']);
  });

  it('AT-05 publish Module 2 -> only Module 2 changes', async () => {
    const before = await snap();
    await go(m2, 'PUBLISHED');
    const after = await snap();
    expect(st(after[m2])).toBe('PUBLISHED');
    for (const id of [m1, m3, other]) expect(after[id]).toEqual(before[id]);
    const { data: full } = await db.from('course_modules').select('published_at').eq('id', m2).single();
    expect(full.published_at).toBeTruthy();
  });

  it('AT-06 deactivate Module 2 -> only Module 2 becomes INACTIVE', async () => {
    const before = await snap();
    await go(m2, 'INACTIVE');
    const after = await snap();
    expect(st(after[m2])).toBe('INACTIVE');
    for (const id of [m1, m3, other]) expect(after[id]).toEqual(before[id]);
  });

  it('AT-07 activate Module 2 -> Module 1 stays PUBLISHED, Module 2 PUBLISHED', async () => {
    const before = await snap();
    await go(m2, 'PUBLISHED');
    const after = await snap();
    expect(st(after[m1])).toBe('PUBLISHED');
    expect(st(after[m2])).toBe('PUBLISHED');
    for (const id of [m1, m3, other]) expect(after[id]).toEqual(before[id]);
    // order and required flag never move with status
    expect(after[m2].position).toBe(before[m2].position);
    expect(after[m2].required_for_completion).toBe(before[m2].required_for_completion);
  });

  it('AT-08 mixed states stay independent across a full cycle', async () => {
    await go(m1, 'INACTIVE');
    let s = await snap();
    expect([st(s[m1]), st(s[m2]), st(s[m3])]).toEqual(['INACTIVE', 'PUBLISHED', 'INACTIVE']);
    await go(m3, 'PUBLISHED');
    s = await snap();
    expect([st(s[m1]), st(s[m2]), st(s[m3])]).toEqual(['INACTIVE', 'PUBLISHED', 'PUBLISHED']);
    expect(st(s[other])).toBe('DRAFT');
  });

  it('rejects invalid transitions without changing any row', async () => {
    const before = await snap();
    await expect(go(other, 'INACTIVE', otherCourseId)).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
    expect(await snap()).toEqual(before);
  });

  it('cannot mutate a module through the wrong course or workspace', async () => {
    const before = await snap();
    await expect(go(m2, 'INACTIVE', otherCourseId)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(applyModuleStatus(db, { workspaceId: randomUUID(), courseId, moduleId: m2, target: 'INACTIVE' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(await snap()).toEqual(before);
  });
});
