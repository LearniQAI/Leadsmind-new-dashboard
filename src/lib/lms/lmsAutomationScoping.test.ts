import { describe, it, expect } from 'vitest';
import {
  ruleMatchesCourse,
  quizScoreGatePasses,
} from '../../../libs/core/src/events/lms-rule-matching';

// Batch 1 — "Make Course Automations Actually Work".
// G1 (course scoping) and the quiz-score gate are the two pure decisions inside
// emitLMSEvent; the rest of that function is Supabase I/O exercised live (see
// docs/lms-automation-batch1-verification.md).

describe('ruleMatchesCourse — G1 course scoping', () => {
  it('a course-scoped rule fires only for its own course', () => {
    expect(ruleMatchesCourse({ course_id: 'course-A' }, 'course-A')).toBe(true);
    expect(ruleMatchesCourse({ course_id: 'course-A' }, 'course-B')).toBe(false);
  });

  it('a course-scoped rule never fires for an event with no course', () => {
    expect(ruleMatchesCourse({ course_id: 'course-A' }, undefined)).toBe(false);
    expect(ruleMatchesCourse({ course_id: 'course-A' }, null)).toBe(false);
  });

  it('a NULL rule stays workspace-wide (fires for any course, and for no course)', () => {
    expect(ruleMatchesCourse({ course_id: null }, 'course-A')).toBe(true);
    expect(ruleMatchesCourse({ course_id: null }, 'course-B')).toBe(true);
    expect(ruleMatchesCourse({ course_id: null }, undefined)).toBe(true);
    expect(ruleMatchesCourse({}, 'course-A')).toBe(true);
  });
});

describe('quizScoreGatePasses — Minimum Score field', () => {
  it('is a no-op for non-quiz events', () => {
    expect(quizScoreGatePasses('course_completed', { trigger_config: { min_score: 90 } }, 10)).toBe(true);
  });

  it('passes when the rule has no min_score', () => {
    expect(quizScoreGatePasses('quiz_passed', { trigger_config: {} }, 42)).toBe(true);
    expect(quizScoreGatePasses('quiz_passed', {}, 42)).toBe(true);
  });

  it('passes when no score is supplied (cannot gate what we do not know)', () => {
    expect(quizScoreGatePasses('quiz_passed', { trigger_config: { min_score: 80 } }, undefined)).toBe(true);
  });

  it('quiz_passed requires score >= min_score', () => {
    expect(quizScoreGatePasses('quiz_passed', { trigger_config: { min_score: 80 } }, 80)).toBe(true);
    expect(quizScoreGatePasses('quiz_passed', { trigger_config: { min_score: 80 } }, 95)).toBe(true);
    expect(quizScoreGatePasses('quiz_passed', { trigger_config: { min_score: 80 } }, 79)).toBe(false);
  });

  it('quiz_failed requires score < min_score', () => {
    expect(quizScoreGatePasses('quiz_failed', { trigger_config: { min_score: 50 } }, 30)).toBe(true);
    expect(quizScoreGatePasses('quiz_failed', { trigger_config: { min_score: 50 } }, 50)).toBe(false);
    expect(quizScoreGatePasses('quiz_failed', { trigger_config: { min_score: 50 } }, 70)).toBe(false);
  });
});
