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
  // Course Start Method 1 (email access link, "hold for manual approval"): a real signup
  // that exists but has not been approved yet. Added here rather than left to fall through
  // to the "unrecognized status = active" default below — a pending_approval row must never
  // grant real access before an admin approves it.
  'pending_approval',
  'rejected',
] as const;

export function isEnrolmentActive(
  row:
    | { status?: string | null; active?: boolean | null; grace_period_expires_at?: string | null }
    | null
    | undefined
): boolean {
  if (!row) return false;
  if (row.active === false) return false;
  if (row.status && (INACTIVE_ENROLMENT_STATUSES as readonly string[]).includes(row.status)) {
    return false;
  }
  // Course Start Method 4 ('grace_period' payment-failure policy): the invoice.payment_failed
  // webhook sets grace_period_expires_at and leaves status = 'active'. Access holds only until
  // that moment, then it's gone — computed live here so no cron is needed to flip the status.
  // A successful later payment (invoice.payment_succeeded) clears the field back to null.
  // Rows the CRM automation suspends set status = 'suspended' alongside this field, so those
  // are already rejected by the status check above and never reach here.
  if (row.grace_period_expires_at) {
    return Date.now() < Date.parse(row.grace_period_expires_at);
  }
  return true;
}
