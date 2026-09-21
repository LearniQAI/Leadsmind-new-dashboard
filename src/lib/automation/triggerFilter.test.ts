import { describe, it, expect } from 'vitest';
import { matchesTriggerConfig } from '@/lib/automation/triggerFilter';

describe('matchesTriggerConfig', () => {
  it('tag_added only matches the configured tag (by id or by name)', () => {
    const cfg = { tag_id: 't1', tag_name: 'VIP' };
    expect(matchesTriggerConfig('tag_added', cfg, { tagId: 't1' })).toBe(true);
    expect(matchesTriggerConfig('tag_added', cfg, { tag: 'vip' })).toBe(true);
    expect(matchesTriggerConfig('tag_added', cfg, { tagId: 't2' })).toBe(false);
    expect(matchesTriggerConfig('tag_added', cfg, { tag: 'Other' })).toBe(false);
    expect(matchesTriggerConfig('tag_added', cfg, {})).toBe(false);
  });

  it('course and funnel triggers match only their configured id', () => {
    expect(matchesTriggerConfig('course_completed', { course_id: 'c1' }, { courseId: 'c1' })).toBe(true);
    expect(matchesTriggerConfig('course_completed', { course_id: 'c1' }, { courseId: 'c2' })).toBe(false);
    expect(matchesTriggerConfig('student_enrolled_course', { course_id: 'c1' }, {})).toBe(false);
    expect(matchesTriggerConfig('funnel_subscribed', { funnel_id: 'f1' }, { funnelId: 'f1', pageId: 'p' })).toBe(true);
    expect(matchesTriggerConfig('funnel_subscribed', { funnel_id: 'f1' }, { pageId: 'p' })).toBe(false);
  });

  it('no filter means "any" for generic workflows but never matches for sequences', () => {
    expect(matchesTriggerConfig('tag_added', {}, { tagId: 'x' })).toBe(true);
    expect(matchesTriggerConfig('tag_added', {}, { tagId: 'x' }, { requireFilter: true })).toBe(false);
    expect(matchesTriggerConfig('course_completed', null, { courseId: 'x' }, { requireFilter: true })).toBe(false);
  });

  it('triggers without a filter kind are unaffected', () => {
    expect(matchesTriggerConfig('contact_created', {}, {}, { requireFilter: true })).toBe(true);
    expect(matchesTriggerConfig('appointment_booked', undefined, undefined, { requireFilter: true })).toBe(true);
  });
});
