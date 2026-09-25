import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  lesson: { course_id: 'c1', workspace_id: 'w1', is_preview: false, is_active: false } as Record<string, any>,
  role: 'admin' as string | null,
  getOrCreateStudentContact: vi.fn(async () => 'contact-1'),
  writes: [] as string[],
}));

// Chainable admin-client fake: records any write method, answers the two reads.
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const q: any = {};
      for (const m of ['select', 'eq']) q[m] = () => q;
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

beforeEach(() => { h.writes = []; h.getOrCreateStudentContact.mockClear(); });

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
