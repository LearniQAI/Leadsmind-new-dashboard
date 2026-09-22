import { describe, it, expect } from 'vitest';
import { goalsToRules, rulesToGoals, isEditorRule } from '@/lib/automation/sequenceGoals';

describe('sequence goals <-> goal_rules', () => {
  const tags = new Map([['t1', 'Hot Lead']]);

  it('builds rules from editor goals (tag name stored beside the id) and dedupes', () => {
    const rules = goalsToRules([{ kind: 'appointment' }, { kind: 'appointment' }, { kind: 'invoice' }, { kind: 'tag', tagId: 't1' }, { kind: 'tag', tagId: 't1' }], tags);
    expect(rules).toEqual([
      { field: 'meeting_booked', operator: 'equals', value: true },
      { field: 'invoice_paid', operator: 'equals', value: true },
      { field: 'tag', operator: 'equals', value: 'Hot Lead', tag_id: 't1' },
    ]);
  });

  it('drops a tag goal whose tag is unknown', () => {
    expect(goalsToRules([{ kind: 'tag', tagId: 'gone' }], tags)).toEqual([]);
  });

  it('round-trips through the editor representation', () => {
    const rules = goalsToRules([{ kind: 'invoice' }, { kind: 'tag', tagId: 't1' }], tags);
    expect(rulesToGoals(rules)).toEqual([{ kind: 'invoice' }, { kind: 'tag', tagId: 't1' }]);
  });

  it('preserves rules the editor cannot represent (e.g. the LMS passed_quiz seed) and replaces its own', () => {
    const existing = [
      { field: 'passed_quiz', operator: 'equals', value: true },
      { field: 'meeting_booked', operator: 'equals', value: true },
    ];
    const next = goalsToRules([{ kind: 'invoice' }], tags, existing);
    expect(next).toEqual([
      { field: 'invoice_paid', operator: 'equals', value: true },
      { field: 'passed_quiz', operator: 'equals', value: true },
    ]);
    expect(goalsToRules([], tags, existing)).toEqual([{ field: 'passed_quiz', operator: 'equals', value: true }]);
    expect(isEditorRule({ field: 'passed_quiz', operator: 'equals', value: true })).toBe(false);
  });
});
