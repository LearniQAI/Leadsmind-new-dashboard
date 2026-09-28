import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  lesson: { id: 'l1', course_id: 'c1', workspace_id: 'w1', is_preview: false, is_active: false } as Record<string, any>,
  // What the student-visibility lookup finds for the lesson's module.
  moduleVisible: true,
  role: 'admin' as string | null,
  getOrCreateStudentContact: vi.fn(async () => 'contact-1'),
  writes: [] as string[],
}));

// Chainable admin-client fake: records any write method, answers the two reads.
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const q: any = {};
      for (const m of ['select', 'eq', 'in']) q[m] = () => q;
      // Awaited directly: the student-visibility lookup (lessons + their module).
      q.then = (res: any) => res({
        data: table === 'course_lessons'
          ? [{ id: 'l1', is_active: true, module: { is_active: true, publish_status: h.moduleVisible ? 'published' : 'draft' } }]
          : [],
        error: null,
      });
      for (const m of ['insert', 'update', 'upsert', 'delete']) q[m] = () => { h.writes.push(`${table}.${m}`); return q; };
      q.maybeSingle = async () => ({
        data: table === 'content_blocks' ? { id: 'b1', video_asset_id: 'a1', course_lessons: h.lesson }
          : table === 'video_assets' ? { id: 'a1', workspace_id: 'w1', google_drive_file_id: 'drive-file' }
          : null,
        error: null,
      });
      return q;
    },
  }),
}));
vi.mock('@/lib/auth', () => ({
  getUser: async () => ({ id: 'u1' }),
  getUserRoleForWorkspace: async () => h.role,
}));
vi.mock('@/app/actions/studentEnrollments', () => ({ getOrCreateStudentContact: h.getOrCreateStudentContact }));

import { resolveVideoAccess } from './videoAccess';

beforeEach(() => { h.writes = []; h.moduleVisible = true; h.getOrCreateStudentContact.mockClear(); });

describe('resolveVideoAccess — builder canvas (staff)', () => {
  it('staff get bytes for a draft / inactive lesson, with no student contact created and no writes', async () => {
    h.role = 'admin';
    expect(await resolveVideoAccess('a1', 'b1')).toEqual({ ok: true, fileId: 'drive-file' });
    expect(h.getOrCreateStudentContact).not.toHaveBeenCalled();
    expect(h.writes).toEqual([]);
  });

  it('a non-staff user on the same draft lesson goes through the enrolment check instead', async () => {
    h.role = null;
    const res = await resolveVideoAccess('a1', 'b1');
    expect(res.ok).toBe(false);
    expect(h.getOrCreateStudentContact).toHaveBeenCalled();
  });
});

describe('resolveVideoAccess — DRAFT / INACTIVE modules are hidden from students', () => {
  it('a student gets no bytes for a lesson in a DRAFT module, and no contact is created', async () => {
    h.role = null;
    h.moduleVisible = false;
    expect(await resolveVideoAccess('a1', 'b1')).toMatchObject({ ok: false, status: 404 });
    expect(h.getOrCreateStudentContact).not.toHaveBeenCalled();
  });

  it('a free-preview lesson in a DRAFT module is not served to an anonymous viewer either', async () => {
    h.role = null;
    h.moduleVisible = false;
    h.lesson = { ...h.lesson, is_preview: true, is_active: true };
    const res = await resolveVideoAccess('a1', 'b1');
    expect(res.ok).toBe(false);
    h.lesson = { ...h.lesson, is_preview: false, is_active: false };
  });

  it('staff still get bytes for a DRAFT module lesson (builder preview)', async () => {
    h.role = 'admin';
    h.moduleVisible = false;
    expect(await resolveVideoAccess('a1', 'b1')).toEqual({ ok: true, fileId: 'drive-file' });
  });
});
