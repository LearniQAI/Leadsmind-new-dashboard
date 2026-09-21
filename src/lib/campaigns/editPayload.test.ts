import { describe, it, expect } from 'vitest';
import { buildCampaignEditPayload, type EditInitial, type EditFormState } from '@/lib/campaigns/editPayload';

const designed = {
  id: 'c1', builder_json: [{ id: 'b', type: 'text' }], body_html: '<designed/>', preview_text: 'pre',
  segment: { tags: ['t-uuid'], emails: ['a@x.com'], is_automated: true },
};
const initial: EditInitial = { body: 'pre', tagNames: ['VIP'], ruleKey: 'null', segmentId: null, combine: 'AND' };
const form = (o: Partial<EditFormState> = {}): EditFormState => ({ name: 'n', subject: 's', body: 'pre', tagNames: ['VIP'], ruleGroup: null, segmentId: null, combine: 'AND', ...o });
const idFor = (n: string) => (n === 'VIP' ? 't-uuid' : n === 'New' ? 'n-uuid' : undefined);

describe('buildCampaignEditPayload (B4)', () => {
  it('a name-only edit writes ONLY name+subject — never body_html/preview_text/segment', () => {
    const p = buildCampaignEditPayload(designed, initial, form({ name: 'Renamed' }), idFor);
    expect(p).toEqual({ name: 'Renamed', subject: 's' });
    expect('body_html' in p || 'preview_text' in p || 'segment' in p).toBe(false);
  });
  it('editing the preview on a designed campaign writes preview_text but never body_html', () => {
    const p = buildCampaignEditPayload(designed, initial, form({ body: 'new preview' }), idFor);
    expect(p.preview_text).toBe('new preview');
    expect('body_html' in p).toBe(false);
  });
  it('an undesigned campaign still gets body_html when the body is edited', () => {
    const p = buildCampaignEditPayload({ ...designed, builder_json: [] }, initial, form({ body: 'plain' }), idFor);
    expect(p).toMatchObject({ preview_text: 'plain', body_html: 'plain' });
  });
  it('changing the audience keeps the auto-sender flag and direct addresses', () => {
    const p = buildCampaignEditPayload(designed, initial, form({ tagNames: ['VIP', 'New'] }), idFor);
    expect(p.segment).toMatchObject({ tags: ['t-uuid', 'n-uuid'], emails: ['a@x.com'], is_automated: true });
  });
});
