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

export type EnrolmentAccessRow = {
  status?: string | null;
  active?: boolean | null;
  grace_period_expires_at?: string | null;
  expires_at?: string | null;
};

/**
 * Why an enrolment does NOT currently grant access, or null when it does. Single source of
 * truth: isEnrolmentActive() is just "reason === null", so every gate and every 403 message
 * agrees. Callers must select expires_at / grace_period_expires_at for them to be enforced — a
 * row that doesn't carry the field is treated as having no expiry.
 */
export function enrolmentInactiveReason(row: EnrolmentAccessRow | null | undefined): string | null {
  if (!row) return 'You are not enrolled in this course.';
  if (row.active === false) return 'Your enrolment in this course is no longer active.';
  if (row.status && (INACTIVE_ENROLMENT_STATUSES as readonly string[]).includes(row.status)) {
    if (row.status === 'pending_approval') return 'Your enrolment is still awaiting approval.';
    if (row.status === 'expired') return 'Your access to this course has expired.';
    return 'Your enrolment in this course is no longer active.';
  }
  // Time-limited access (e.g. the grant_partial_access automation sets expires_at). Null = no
  // expiry. Evaluated live so no cron is needed to flip the status when the date passes.
  if (row.expires_at) {
    const t = Date.parse(row.expires_at);
    if (!Number.isNaN(t) && Date.now() >= t) return 'Your access to this course has expired.';
  }
  // Course Start Method 4 ('grace_period' payment-failure policy): the invoice.payment_failed
  // webhook sets grace_period_expires_at and leaves status = 'active'. Access holds only until
  // that moment, then it's gone. A successful later payment clears the field back to null.
  if (row.grace_period_expires_at && Date.now() >= Date.parse(row.grace_period_expires_at)) {
    return 'Your payment grace period has ended.';
  }
  return null;
}

export function isEnrolmentActive(row: EnrolmentAccessRow | null | undefined): boolean {
  return enrolmentInactiveReason(row) === null;
}
