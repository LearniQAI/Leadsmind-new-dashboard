// Shapes a lms_remedial_assignments row for the BROWSER (Batch 3 / fix 4).
//
// The stored row's validation_questions carry the answer key (`correctAnswer`) and an `explanation`
// that spells it out. The remedial page used to hand the whole row to RemedialClient, and the
// generate route returned it verbatim, so both shipped the key to the client (RSC props / JSON).
// Grading is already server-side (POST /api/lms/remedial/submit re-reads the stored key), so the
// client never needs it. This is an allowlist, not a blocklist: a new key-bearing field added to the
// row later stays server-side by default.

export interface ClientRemedialQuestion {
  questionText: string;
  questionType?: string;
  options: string[];
}

export interface ClientRemedialAssignment {
  id: string;
  status: string | null;
  incorrect_attempts_count: number | null;
  methodology_a_text: string | null;
  methodology_b_case_study: string | null;
  methodology_c_analogy: string | null;
  restore_progress_percent: number | null;
  restore_video_timestamp: number | null;
  validation_questions: ClientRemedialQuestion[];
}

export function toClientRemedialAssignment(row: any): ClientRemedialAssignment {
  const questions = Array.isArray(row?.validation_questions) ? row.validation_questions : [];
  return {
    id: row.id,
    status: row.status ?? null,
    incorrect_attempts_count: row.incorrect_attempts_count ?? null,
    methodology_a_text: row.methodology_a_text ?? null,
    methodology_b_case_study: row.methodology_b_case_study ?? null,
    methodology_c_analogy: row.methodology_c_analogy ?? null,
    restore_progress_percent: row.restore_progress_percent ?? null,
    restore_video_timestamp: row.restore_video_timestamp ?? null,
    validation_questions: questions.map((q: any) => ({
      questionText: q?.questionText ?? '',
      questionType: q?.questionType,
      options: Array.isArray(q?.options) ? q.options : [],
    })),
  };
}
