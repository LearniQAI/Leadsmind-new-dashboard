import { describe, it, expect } from 'vitest';
import { toClientRemedialAssignment } from './remedialClient';

const row = {
  id: 'a1', enrollment_id: 'e1', contact_id: 'c1', course_id: 'co1', lesson_id: 'l1',
  status: 'pending', incorrect_attempts_count: 1,
  methodology_a_text: 'A', methodology_b_case_study: 'B', methodology_c_analogy: 'C',
  restore_progress_percent: 0, restore_video_timestamp: 0,
  validation_questions: [
    { questionText: 'Q1?', questionType: 'mcq', options: ['x', 'y'], correctAnswer: 1, explanation: 'because y' },
    { questionText: 'Q2?', questionType: 'true_false', options: [], correctAnswer: true, explanation: 'it is true' },
  ],
};

describe('toClientRemedialAssignment', () => {
  it('never carries correctAnswer or explanation to the client (anywhere in the payload)', () => {
    const json = JSON.stringify(toClientRemedialAssignment(row));
    expect(json).not.toMatch(/correctAnswer/i);
    expect(json).not.toMatch(/explanation/i);
    expect(json).not.toContain('because y');
  });

  it('keeps everything the remedial UI renders', () => {
    const a = toClientRemedialAssignment(row);
    expect(a.id).toBe('a1');
    expect(a.methodology_a_text).toBe('A');
    expect(a.validation_questions).toEqual([
      { questionText: 'Q1?', questionType: 'mcq', options: ['x', 'y'] },
      { questionText: 'Q2?', questionType: 'true_false', options: [] },
    ]);
  });

  it('drops internal ids and any unknown future field (allowlist)', () => {
    const a: any = toClientRemedialAssignment({ ...row, secret_new_column: 'k' });
    expect(a.secret_new_column).toBeUndefined();
    expect(a.contact_id).toBeUndefined();
    expect(a.enrollment_id).toBeUndefined();
  });

  it('tolerates a malformed / missing question list', () => {
    expect(toClientRemedialAssignment({ ...row, validation_questions: null }).validation_questions).toEqual([]);
    expect(toClientRemedialAssignment({ ...row, validation_questions: [{}] }).validation_questions[0].options).toEqual([]);
  });
});
