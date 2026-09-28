import { describe, it, expect } from 'vitest';
import { buildModuleCopy } from './duplicateModule';

describe('buildModuleCopy', () => {
  const published = {
    id: 'orig', course_id: 'c', workspace_id: 'w', title: 'Intro', description: 'd', icon: '📚',
    publish_status: 'published', is_active: true, required_for_completion: true, drip_days: 3, nqf_level: '5',
    position: 2, created_at: 'x', updated_at: 'y', published_at: 'z',
  };

  it('never carries the identity or timestamps of the original', () => {
    const copy = buildModuleCopy(published, 5) as any;
    for (const k of ['id', 'created_at', 'updated_at']) expect(copy).not.toHaveProperty(k);
  });

  it('is always a DRAFT, active, never published — whatever the original was', () => {
    for (const orig of [
      published,
      { ...published, is_active: false },
      { ...published, publish_status: 'coming_soon' },
      { ...published, publish_status: 'draft' },
    ]) {
      const copy = buildModuleCopy(orig, 5);
      expect(copy.publish_status).toBe('draft');
      expect(copy.is_active).toBe(true);
      expect(copy.published_at).toBeNull();
    }
  });

  it('takes the given position and keeps the module settings', () => {
    const copy = buildModuleCopy(published, 7);
    expect(copy.position).toBe(7);
    expect(copy).toMatchObject({ course_id: 'c', workspace_id: 'w', required_for_completion: true, drip_days: 3, title: 'Intro (Copy)' });
  });

  it('does not mutate the original', () => {
    const snapshot = JSON.stringify(published);
    buildModuleCopy(published, 9);
    expect(JSON.stringify(published)).toBe(snapshot);
  });
});
