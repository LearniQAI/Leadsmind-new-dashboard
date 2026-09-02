import { describe, it, expect } from 'vitest';
import {
  gradeSingleQuestion,
  gradeQuestionSet,
  gradeWithManualAwards,
  buildClientQuestion,
  normalizeCodeSubmission,
  matchesAccepted,
  levenshtein,
  typoTolerance,
  LIVE_GRADED_TYPES,
  MANUAL_REVIEW_TYPES,
} from './quizGrading';

/* ---------- the 3 pre-existing types must be byte-for-byte unchanged ---------- */

describe('regression: mcq / true_false / short_answer', () => {
  const mcq = {
    id: 'q1', question_type: 'mcq', points: 2,
    options: [{ text: 'A' }, { text: 'B' }, { text: 'C' }],
    correct_answer: { correct_option_index: 1 },
  };
  it('mcq correct earns full points, wrong earns 0', () => {
    expect(gradeSingleQuestion(mcq, 'B').earned).toBe(2);
    expect(gradeSingleQuestion(mcq, 'A').earned).toBe(0);
    expect(gradeSingleQuestion(mcq, undefined).earned).toBe(0);
  });

  const tf = {
    id: 'q2', question_type: 'true_false', points: 1,
    options: [{ text: 'True' }, { text: 'False' }],
    correct_answer: { correct_option_index: 0 },
  };
  it('true_false', () => {
    expect(gradeSingleQuestion(tf, 'True').earned).toBe(1);
    expect(gradeSingleQuestion(tf, 'False').earned).toBe(0);
  });

  const sa = {
    id: 'q3', question_type: 'short_answer', points: 1,
    correct_answer: { synonyms: ['const', 'let'] },
  };
  it('short_answer is case-insensitive exact match against synonyms', () => {
    expect(gradeSingleQuestion(sa, 'CONST').earned).toBe(1);
    expect(gradeSingleQuestion(sa, '  let ').earned).toBe(1);
    expect(gradeSingleQuestion(sa, 'var').earned).toBe(0);
  });
});

/* ---------- matching ---------- */

describe('matching', () => {
  const q = {
    id: 'm1', question_type: 'matching', points: 4,
    metadata: { pairs: [{ left: 'HTTP', right: '80' }, { left: 'HTTPS', right: '443' }] },
  };
  it('all pairs correct -> full points', () => {
    expect(gradeSingleQuestion(q, { HTTP: '80', HTTPS: '443' }).earned).toBe(4);
  });
  it('any pair wrong -> 0 (all-or-nothing)', () => {
    expect(gradeSingleQuestion(q, { HTTP: '80', HTTPS: '80' }).earned).toBe(0);
  });
  it('missing answer -> 0', () => {
    expect(gradeSingleQuestion(q, { HTTP: '80' }).earned).toBe(0);
    expect(gradeSingleQuestion(q, undefined).earned).toBe(0);
  });
});

/* ---------- ordering ---------- */

describe('ordering', () => {
  const q = {
    id: 'o1', question_type: 'ordering', points: 3,
    metadata: { items: ['plan', 'build', 'ship'] },
  };
  it('exact order -> full points', () => {
    expect(gradeSingleQuestion(q, ['plan', 'build', 'ship']).earned).toBe(3);
  });
  it('wrong order -> 0', () => {
    expect(gradeSingleQuestion(q, ['build', 'plan', 'ship']).earned).toBe(0);
  });
  it('wrong length -> 0', () => {
    expect(gradeSingleQuestion(q, ['plan', 'build']).earned).toBe(0);
  });
});

/* ---------- fill_blank ---------- */

describe('fill_blank', () => {
  const q = {
    id: 'f1', question_type: 'fill_blank', points: 2,
    metadata: {
      text_with_blanks: 'The sky is [blank] and grass is [blank].',
      blanks: [{ accepted: ['blue'] }, { accepted: ['green', 'verdant'] }],
    },
  };
  it('every blank matches (case-insensitive) -> full points', () => {
    expect(gradeSingleQuestion(q, ['BLUE', 'green']).earned).toBe(2);
    expect(gradeSingleQuestion(q, ['blue', 'Verdant']).earned).toBe(2);
  });
  it('one blank wrong -> 0', () => {
    expect(gradeSingleQuestion(q, ['blue', 'yellow']).earned).toBe(0);
  });
  it('wrong number of answers -> 0', () => {
    expect(gradeSingleQuestion(q, ['blue']).earned).toBe(0);
  });
  it('respects case_sensitive flag', () => {
    const cs = { ...q, metadata: { ...q.metadata, case_sensitive: true } };
    expect(gradeSingleQuestion(cs, ['BLUE', 'green']).earned).toBe(0);
    expect(gradeSingleQuestion(cs, ['blue', 'green']).earned).toBe(2);
  });
});

/* ---------- code ---------- */

describe('code (normalized text match, NOT execution)', () => {
  const q = {
    id: 'c1', question_type: 'code', points: 5,
    metadata: {
      accepted_solutions: ['function add(a,b){\n  return a + b;\n}'],
      starter_template: 'function add(a,b){}',
      match_mode: 'normalized',
    },
  };
  it('matches ignoring indentation / blank lines / CRLF', () => {
    expect(gradeSingleQuestion(q, 'function add(a,b){\n\n        return a + b;\n}\n').earned).toBe(5);
    expect(gradeSingleQuestion(q, 'function add(a,b){\r\n  return a + b;\r\n}').earned).toBe(5);
  });
  it('different logic -> 0', () => {
    expect(gradeSingleQuestion(q, 'function add(a,b){ return a - b; }').earned).toBe(0);
  });
  it('empty submission -> 0', () => {
    expect(gradeSingleQuestion(q, '').earned).toBe(0);
  });
  it('no accepted solutions configured -> 0', () => {
    expect(gradeSingleQuestion({ ...q, metadata: { accepted_solutions: [] } }, 'anything').earned).toBe(0);
  });
});

/* ---------- file_upload ---------- */

describe('file_upload', () => {
  const q = { id: 'u1', question_type: 'file_upload', points: 10, metadata: { rubric_criteria: [] } };
  it('always earns 0 automatically and is flagged manual', () => {
    const r = gradeSingleQuestion(q, { file_url: 'x', file_name: 'a.pdf' });
    expect(r.earned).toBe(0);
    expect(r.manual).toBe(true);
  });
});

/* ---------- set-level grading ---------- */

describe('gradeQuestionSet', () => {
  const questions = [
    { id: 'q1', question_type: 'mcq', points: 1, options: [{ text: 'A' }, { text: 'B' }], correct_answer: { correct_option_index: 0 } },
    { id: 'q2', question_type: 'ordering', points: 1, metadata: { items: ['1', '2'] } },
  ];
  it('scores across mixed auto types', () => {
    const r = gradeQuestionSet(questions, { q1: 'A', q2: ['1', '2'] }, 70);
    expect(r.maxScore).toBe(2);
    expect(r.rawScore).toBe(2);
    expect(r.score).toBe(100);
    expect(r.passed).toBe(true);
    expect(r.pendingManual).toBe(false);
  });
  it('a file_upload question sets pendingManual and blocks pass', () => {
    const withFile = [...questions, { id: 'q3', question_type: 'file_upload', points: 2, metadata: {} }];
    const r = gradeQuestionSet(withFile, { q1: 'A', q2: ['1', '2'] }, 70);
    expect(r.maxScore).toBe(4);
    expect(r.autoRawScore).toBe(2);
    expect(r.pendingManual).toBe(true);
    expect(r.passed).toBe(false); // never passed while pending
  });
});

describe('gradeWithManualAwards', () => {
  const questions = [
    { id: 'q1', question_type: 'mcq', points: 2, options: [{ text: 'A' }, { text: 'B' }], correct_answer: { correct_option_index: 0 } },
    { id: 'q2', question_type: 'file_upload', points: 8, metadata: {} },
  ];
  it('sums auto + clamped manual awards into the final result', () => {
    const r = gradeWithManualAwards(questions, { q1: 'A' }, { q2: 6 }, 70);
    expect(r.maxScore).toBe(10);
    expect(r.rawScore).toBe(8); // 2 auto + 6 manual
    expect(r.score).toBe(80);
    expect(r.passed).toBe(true);
    expect(r.pendingManual).toBe(false);
  });
  it('clamps an over-max award', () => {
    const r = gradeWithManualAwards(questions, { q1: 'X' }, { q2: 999 }, 70);
    expect(r.rawScore).toBe(8); // 0 auto + clamped 8
  });
});

/* ---------- client shaping: the answer key must not leak ---------- */

describe('buildClientQuestion strips the key for the 5 new types', () => {
  it('matching: no pairs, only left items + shuffled right bank', () => {
    const c = buildClientQuestion({
      id: 'm1', question_type: 'matching', question_text: 'x', points: 1,
      metadata: { pairs: [{ left: 'A', right: '1' }, { left: 'B', right: '2' }] },
    });
    expect(c.metadata).toBeUndefined();
    expect(c.correct_answer).toBeUndefined();
    expect(c.presentation.leftItems).toEqual(['A', 'B']);
    expect([...c.presentation.rightItems].sort()).toEqual(['1', '2']);
  });
  it('ordering: items present but caller cannot tell the correct order from the shape', () => {
    const c = buildClientQuestion({
      id: 'o1', question_type: 'ordering', question_text: 'x', points: 1,
      metadata: { items: ['a', 'b', 'c', 'd'] },
    });
    expect(c.metadata).toBeUndefined();
    expect([...c.presentation.items].sort()).toEqual(['a', 'b', 'c', 'd']);
  });
  it('fill_blank: text + count, no accepted answers', () => {
    const c = buildClientQuestion({
      id: 'f1', question_type: 'fill_blank', question_text: 'x', points: 1,
      metadata: { text_with_blanks: 'a [blank] b [blank]', blanks: [{ accepted: ['1'] }, { accepted: ['2'] }] },
    });
    expect(c.presentation.blankCount).toBe(2);
    expect(JSON.stringify(c)).not.toContain('accepted');
  });
  it('code: starter only, no accepted_solutions', () => {
    const c = buildClientQuestion({
      id: 'c1', question_type: 'code', question_text: 'x', points: 1,
      metadata: { starter_template: 'foo()', accepted_solutions: ['secret answer'] },
    });
    expect(c.presentation.starter_template).toBe('foo()');
    expect(JSON.stringify(c)).not.toContain('secret answer');
  });
  it('mcq is passed through unchanged (still preview-gradable client-side)', () => {
    const c = buildClientQuestion({
      id: 'q1', question_type: 'mcq', question_text: 'x', points: 1,
      options: [{ text: 'A' }], correct_answer: { correct_option_index: 0 },
    });
    expect(c.options).toEqual([{ text: 'A' }]);
    expect(c.correct_answer).toEqual({ correct_option_index: 0 });
  });
});

describe('helpers', () => {
  it('normalizeCodeSubmission', () => {
    expect(normalizeCodeSubmission('  a  b \n\n  c ')).toBe('a b\nc');
  });
  it('matchesAccepted — tier 1 exact still works (regression)', () => {
    expect(matchesAccepted('Foo', ['foo', 'bar'])).toBe(true);
    expect(matchesAccepted('Foo', ['foo'], true)).toBe(false); // case-sensitive tier-1
  });
  it('type sets', () => {
    expect(LIVE_GRADED_TYPES.has('code')).toBe(true);
    expect(LIVE_GRADED_TYPES.has('file_upload')).toBe(false);
    expect(MANUAL_REVIEW_TYPES.has('file_upload')).toBe(true);
  });
  it('levenshtein', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('abc', 'abc')).toBe(0);
    expect(levenshtein('', 'abc')).toBe(3);
  });
  it('typoTolerance scales and caps at 2', () => {
    expect(typoTolerance(3)).toBe(0);
    expect(typoTolerance(6)).toBe(1);
    expect(typoTolerance(20)).toBe(2);
  });
});

/* ---------- G6a: deterministic fuzzy matching ---------- */

describe('matchesAccepted — Batch 3 fuzzy tiers', () => {
  it('accepts a single-character typo on a medium word', () => {
    expect(matchesAccepted('mitochondira', ['mitochondria'])).toBe(true); // transposition, len 12 -> tol 2
    expect(matchesAccepted('recieve', ['receive'])).toBe(true);
  });
  it('accepts casing + punctuation variants', () => {
    expect(matchesAccepted("Newton's 2nd Law.", ['newtons 2nd law'])).toBe(true);
    expect(matchesAccepted('  photosynthesis!!! ', ['photosynthesis'])).toBe(true);
  });
  it('does NOT over-tolerate short words', () => {
    expect(matchesAccepted('cat', ['cot'])).toBe(false); // len 3 -> tol 0
    expect(matchesAccepted('ion', ['eon'])).toBe(false);
  });
  it('rejects a genuinely different answer (no false positive)', () => {
    expect(matchesAccepted('respiration', ['photosynthesis'])).toBe(false);
    expect(matchesAccepted('France', ['Germany', 'Spain'])).toBe(false);
    expect(matchesAccepted('42', ['24'])).toBe(false); // len 2 -> tol 0
  });
  it('{ fuzzy: false } restores pure exact behaviour', () => {
    expect(matchesAccepted('recieve', ['receive'], false, { fuzzy: false })).toBe(false);
    expect(matchesAccepted('receive', ['receive'], false, { fuzzy: false })).toBe(true);
  });
  it('short_answer / fill_blank grading picks up the fuzzy tolerance', () => {
    const sa = { id: 's', question_type: 'short_answer', points: 1, correct_answer: { synonyms: ['mitochondria'] } };
    expect(gradeSingleQuestion(sa, 'Mitochondrion').earned).toBe(1); // close variant
    expect(gradeSingleQuestion(sa, 'nucleus').earned).toBe(0);

    const fb = {
      id: 'f', question_type: 'fill_blank', points: 1,
      metadata: { text_with_blanks: 'Water is [blank].', blanks: [{ accepted: ['dihydrogen monoxide'] }] },
    };
    expect(gradeSingleQuestion(fb, ['Dihydrogen Monoxide!']).earned).toBe(1);
    expect(gradeSingleQuestion(fb, ['carbon dioxide']).earned).toBe(0);
  });
});
