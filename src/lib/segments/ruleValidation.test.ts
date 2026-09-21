import { describe, it, expect } from 'vitest';
import { validateRule, validateRuleGroup, assertValidRuleGroup, InvalidRuleGroupError, SEGMENT_RULE_FIELDS } from '@/lib/segments/ruleValidation';

const R = (field: string, operator: string, value: any) => ({ field, operator, value });
const G = (rules: any[], logic: any = 'AND') => ({ logic, rules });

describe('segment rule validation (item 2: unknown fields, item 3: blank values)', () => {
  it('accepts every field/operator the builder offers with a real value', () => {
    expect(validateRuleGroup(G([R('first_name', 'contains', 'ab'), R('tags', 'equals', 'VIP'), R('outstanding_zar_limit', 'greater_than', '100'), R('email_open_count', 'less_than', 3), R('source', 'not_equals', 'x')]))).toBeNull();
  });

  it('rejects an unknown field (previously SQL matched everyone, JS matched no one)', () => {
    expect(validateRuleGroup(G([R('company', 'equals', 'Acme')]))).toMatch(/Unknown segment field "company"/);
    // ...even when a valid sibling exists, so a typo can never be silently ignored
    expect(validateRuleGroup(G([R('company', 'equals', 'Acme'), R('first_name', 'equals', 'A')], 'OR'))).toMatch(/Unknown segment field/);
  });

  it.each([[''], ['   '], [null], [undefined]])('rejects a blank value %j (previously "contains \'\'" matched every contact)', (v) => {
    expect(validateRuleGroup(G([R('first_name', 'contains', v)]))).toMatch(/Enter a value/);
  });

  it('rejects non-numeric values on numeric fields and text values that are not strings', () => {
    expect(validateRuleGroup(G([R('email_open_count', 'greater_than', 'abc')]))).toMatch(/needs a number/);
    expect(validateRuleGroup(G([R('outstanding_zar_limit', 'greater_than', '')]))).toMatch(/Enter a value/);
    expect(validateRuleGroup(G([R('first_name', 'equals', 5)]))).toMatch(/needs a text value/);
  });

  it('rejects operators a field does not support, including the unsupported "in"', () => {
    expect(validateRuleGroup(G([R('tags', 'contains', 'x')]))).toMatch(/not a valid comparison for tags/);
    expect(validateRuleGroup(G([R('first_name', 'in', ['a'])]))).toMatch(/not a valid comparison/);
    expect(validateRuleGroup(G([R('email_open_count', 'equals', 1)]))).toMatch(/not a valid comparison/);
  });

  it('rejects empty/garbage groups and bad logic', () => {
    for (const bad of [null, undefined, {}, G([]), { logic: 'XOR', rules: [R('first_name', 'equals', 'a')] }]) {
      expect(validateRuleGroup(bad as any)).toBeTruthy();
    }
  });

  it('assertValidRuleGroup throws a typed error carrying the message', () => {
    expect(() => assertValidRuleGroup(G([R('nope', 'equals', 'x')]))).toThrow(InvalidRuleGroupError);
    expect(() => assertValidRuleGroup(G([R('first_name', 'equals', 'x')]))).not.toThrow();
  });

  it('positions are reported for multi-rule groups', () => {
    expect(validateRule(R('first_name', 'contains', ''), 2)).toMatch(/condition 3/);
  });

  it('the whitelist matches the 13 fields the SQL compiler implements', () => {
    expect(Object.keys(SEGMENT_RULE_FIELDS).sort()).toEqual(['email', 'email_click_count', 'email_open_count', 'first_name', 'invoice_status', 'last_name', 'lms_course_id', 'lms_course_status', 'outstanding_zar_limit', 'phone', 'source', 'tags', 'timezone'].sort());
  });
});
