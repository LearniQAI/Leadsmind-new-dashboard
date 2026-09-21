// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SegmentRuleBuilder } from './SegmentRuleBuilder';
import { escapeLikePattern, isNotHint } from '@/lib/segments/ruleValidation';
import { SegmentationCompiler } from '@/lib/intelligence/SegmentationCompiler';

afterEach(cleanup);

const group = (field: string, operator: string) => ({ logic: 'AND', rules: [{ field, operator, value: 'x' }] }) as any;
const renderBuilder = (field: string, operator: string) =>
  render(<SegmentRuleBuilder value={group(field, operator)} onChange={() => {}} />);

describe('"is not" hint for invoice / LMS fields', () => {
  it.each([
    ['invoice_status', /at least one invoice whose status is not this value/],
    ['lms_course_id', /enrolled in at least one course other than this one/],
    ['lms_course_status', /at least one enrollment whose status is not this value/],
  ])('%s + is not renders the hint', (field, re) => {
    renderBuilder(field, 'not_equals');
    expect(screen.getByTestId('is-not-hint').textContent).toMatch(re);
    expect(screen.getByTestId('is-not-hint').textContent).toMatch(/not matched/);
  });

  it('is absent for "is", for plain CRM text fields, and for other fields', () => {
    renderBuilder('invoice_status', 'equals');
    expect(screen.queryByTestId('is-not-hint')).toBeNull();
    cleanup();
    renderBuilder('first_name', 'not_equals');
    expect(screen.queryByTestId('is-not-hint')).toBeNull();
    expect(isNotHint('tags', 'not_equals')).toBeNull();
  });
});

describe('contains escaping (shared, one place)', () => {
  it('escapes % _ and \\ only', () => {
    expect(escapeLikePattern('50% off')).toBe('50\\% off');
    expect(escapeLikePattern('a_b')).toBe('a\\_b');
    expect(escapeLikePattern('c\\d')).toBe('c\\\\d');
    expect(escapeLikePattern('plain text')).toBe('plain text');
  });

  it('compileToSql passes the ESCAPED value for contains, and leaves equals untouched', () => {
    const c = SegmentationCompiler.compileToSql('ws', { logic: 'AND', rules: [{ field: 'first_name', operator: 'contains', value: '50% a_b' }] } as any);
    expect(c.params).toEqual(['ws', '50\\% a\\_b']);
    const e = SegmentationCompiler.compileToSql('ws', { logic: 'AND', rules: [{ field: 'first_name', operator: 'equals', value: '50% a_b' }] } as any);
    expect(e.params).toEqual(['ws', '50% a_b']);
  });
});
