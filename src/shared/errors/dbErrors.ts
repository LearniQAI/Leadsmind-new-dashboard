/**
 * Maps raw Postgres / PostgREST errors to messages that are safe and useful to show a user.
 *
 * Why: DB and driver errors carry constraint names, column names and values. They must never reach the
 * browser, but collapsing every one of them to "Something went wrong" (what happened before) made
 * ordinary, fixable situations — a duplicate email, a malformed id, a deleted parent row —
 * indistinguishable from outages. Only the SQLSTATE class is used to pick the message; the raw text is
 * never returned.
 */

export interface FriendlyDbError {
  /** Stable machine code for callers that want to branch (e.g. offer "select the existing one"). */
  code: 'DUPLICATE' | 'DUPLICATE_EMAIL' | 'INVALID_FORMAT' | 'REFERENCE_MISSING' | 'REQUIRED_MISSING' | 'INVALID_VALUE';
  message: string;
  status: number;
  sqlState: string;
}

/** SQLSTATE of a PostgrestError / pg error, if it has one. */
export function sqlStateOf(err: unknown): string | undefined {
  const code = (err as { code?: unknown } | null | undefined)?.code;
  return typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code) ? code : undefined;
}

// The three unique keys on contacts that mean "this email is already a client here": the exact-case key and its
// old twin, and the case-insensitive partial index. Matched by name only to pick the message; the name is never shown.
const CONTACT_EMAIL_KEYS = /contacts_workspace_id_email_key|unique_workspace_contact|contacts_workspace_lower_email_key/;

export function friendlyDbError(err: unknown): FriendlyDbError | null {
  const sqlState = sqlStateOf(err);
  switch (sqlState) {
    case '23505': // unique_violation
      if (CONTACT_EMAIL_KEYS.test(`${(err as any)?.message ?? ''} ${(err as any)?.details ?? ''}`)) {
        return { code: 'DUPLICATE_EMAIL', sqlState, status: 409, message: 'A client with this email already exists.' };
      }
      return { code: 'DUPLICATE', sqlState, status: 409, message: 'This already exists. Check for a duplicate and try again.' };
    case '22P02': // invalid_text_representation (e.g. '' or a non-uuid into a uuid column)
      return { code: 'INVALID_FORMAT', sqlState, status: 422, message: 'Some of the information entered is not in a valid format. Please check it and try again.' };
    case '23503': // foreign_key_violation
      return { code: 'REFERENCE_MISSING', sqlState, status: 409, message: 'This refers to something that no longer exists. Refresh the page and try again.' };
    case '23502': // not_null_violation
      return { code: 'REQUIRED_MISSING', sqlState, status: 422, message: 'A required field is missing. Please fill it in and try again.' };
    case '22007': // invalid_datetime_format (e.g. '' into a timestamp)
    case '22008': // datetime_field_overflow
      return { code: 'INVALID_FORMAT', sqlState, status: 422, message: 'A date or time entered is not valid. Please check it and try again.' };
    case '23514': // check_violation
      return { code: 'INVALID_VALUE', sqlState, status: 422, message: 'One of the values entered is not allowed. Please check it and try again.' };
    default:
      return null;
  }
}
