// One definition of "is this enrolment currently active" shared by every content-access and
// progress-write path, so the course player, the mark-complete action, and the quiz submit
// action can never disagree about whether a student is still enrolled.
//
// An enrolment is considered active unless it has been *explicitly* deactivated — a legacy
// row with a null status still counts as active (every current write path sets
// status:'active', but older rows exist).

export const INACTIVE_ENROLMENT_STATUSES = [
  'inactive',
  'cancelled',
  'canceled',
  'expired',
  'suspended',
  'revoked',
] as const;

export function isEnrolmentActive(
  row: { status?: string | null; active?: boolean | null } | null | undefined
): boolean {
  if (!row) return false;
  if (row.active === false) return false;
  if (row.status && (INACTIVE_ENROLMENT_STATUSES as readonly string[]).includes(row.status)) {
    return false;
  }
  return true;
}
