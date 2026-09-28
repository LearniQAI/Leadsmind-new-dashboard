import { describe, it, expect } from 'vitest';
import { deriveModuleStatus, isValidTransition, statusActionFor, applyModuleStatus, ModuleStatusError } from './moduleStatus';

describe('deriveModuleStatus', () => {
  it('maps the two stored columns onto one lifecycle state', () => {
    expect(deriveModuleStatus({ publish_status: 'draft', is_active: true })).toBe('DRAFT');
    expect(deriveModuleStatus({ publish_status: 'coming_soon', is_active: true })).toBe('DRAFT');
    expect(deriveModuleStatus({ publish_status: 'published', is_active: true })).toBe('PUBLISHED');
    expect(deriveModuleStatus({ publish_status: 'published', is_active: false })).toBe('INACTIVE');
    expect(deriveModuleStatus({ publish_status: 'draft', is_active: false })).toBe('INACTIVE');
  });
});

describe('transitions and actions', () => {
  it('allows only DRAFT->PUBLISHED, PUBLISHED->INACTIVE, INACTIVE->PUBLISHED', () => {
    expect(isValidTransition('DRAFT', 'PUBLISHED')).toBe(true);
    expect(isValidTransition('PUBLISHED', 'INACTIVE')).toBe(true);
    expect(isValidTransition('INACTIVE', 'PUBLISHED')).toBe(true);
    expect(isValidTransition('DRAFT', 'INACTIVE')).toBe(false);
    expect(isValidTransition('PUBLISHED', 'DRAFT')).toBe(false);
    expect(isValidTransition('INACTIVE', 'DRAFT')).toBe(false);
    expect(isValidTransition('PUBLISHED', 'PUBLISHED')).toBe(false);
  });
  it('offers Publish / Deactivate / Activate by state', () => {
    expect(statusActionFor('DRAFT').label).toBe('Publish');
    expect(statusActionFor('PUBLISHED').label).toBe('Deactivate');
    expect(statusActionFor('INACTIVE').label).toBe('Activate');
  });
});

// Minimal chainable stub of the supabase query builder, recording every filter applied.
function stubDb(row: any, updateResult: any[]) {
  const calls: { table: string; filters: [string, any][]; patch?: any }[] = [];
  const builder = (table: string) => {
    const rec: any = { table, filters: [] as [string, any][] };
    calls.push(rec);
    const b: any = {
      select: () => b,
      update: (p: any) => { rec.patch = p; rec.isUpdate = true; return b; },
      eq: (c: string, v: any) => { rec.filters.push([c, v]); return b; },
      is: (c: string, v: any) => { rec.filters.push([c, v]); return b; },
      maybeSingle: async () => ({ data: row, error: null }),
      then: (res: any) => res({ data: updateResult, error: null }),
    };
    return b;
  };
  return { db: { from: builder } as any, calls };
}

describe('applyModuleStatus', () => {
  const args = { workspaceId: 'w', courseId: 'c', moduleId: 'm' };

  it('scopes the update by module id, course id and workspace only (plus the compare-and-set guards)', async () => {
    const { db, calls } = stubDb({ id: 'm', publish_status: 'draft', is_active: true }, [{ id: 'm', publish_status: 'published', is_active: true }]);
    await applyModuleStatus(db, { ...args, target: 'PUBLISHED' });
    const upd = calls.find((c: any) => c.isUpdate)!;
    expect(upd.filters).toEqual(expect.arrayContaining([['id', 'm'], ['course_id', 'c'], ['workspace_id', 'w']]));
    expect(upd.patch.publish_status).toBe('published');
    expect(upd.patch.published_at).toBeTruthy();
  });

  it('deactivate touches only is_active (publish_status preserved so Activate restores it)', async () => {
    const { db, calls } = stubDb({ id: 'm', publish_status: 'published', is_active: true }, [{ id: 'm' }]);
    await applyModuleStatus(db, { ...args, target: 'INACTIVE' });
    const patch = calls.find((c: any) => c.isUpdate)!.patch;
    expect(patch.is_active).toBe(false);
    expect(patch).not.toHaveProperty('publish_status');
  });

  it('rejects invalid transitions and unknown statuses', async () => {
    const { db } = stubDb({ id: 'm', publish_status: 'draft', is_active: true }, []);
    await expect(applyModuleStatus(db, { ...args, target: 'INACTIVE' })).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
    await expect(applyModuleStatus(db, { ...args, target: 'bogus' })).rejects.toMatchObject({ code: 'INVALID_STATUS' });
  });

  it('fails loudly unless exactly one row was updated', async () => {
    const zero = stubDb({ id: 'm', publish_status: 'draft', is_active: true }, []);
    await expect(applyModuleStatus(zero.db, { ...args, target: 'PUBLISHED' })).rejects.toBeInstanceOf(ModuleStatusError);
    const two = stubDb({ id: 'm', publish_status: 'draft', is_active: true }, [{ id: 'a' }, { id: 'b' }]);
    await expect(applyModuleStatus(two.db, { ...args, target: 'PUBLISHED' })).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('404s a module that is not in this course/workspace', async () => {
    const { db } = stubDb(null, []);
    await expect(applyModuleStatus(db, { ...args, target: 'PUBLISHED' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
