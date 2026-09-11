/**
 * Postgres error code 23P01 = exclusion_violation, raised by the
 * `appointments_no_overlap` EXCLUDE constraint when two bookings race for
 * the same calendar slot. The application-level availability check is
 * only a courtesy (fast feedback, no DB round-trip on the common path) —
 * this constraint is the actual source of truth against concurrent
 * double-booking, so every insert into `appointments` must translate this
 * specific code into the user-facing "slot just taken" message rather
 * than letting it surface as a generic/raw database error.
 */
const EXCLUSION_VIOLATION = '23P01';

export function isSlotConflictError(error: unknown): boolean {
  return !!error && typeof error === 'object' && (error as { code?: string }).code === EXCLUSION_VIOLATION
    // Multiple EXCLUDE constraints can fire on `appointments` (calendar_id AND,
    // Task 71, resource_id) — only treat this as the CALENDAR slot conflict
    // when it isn't the resource one, so callers show the right message.
    && !isResourceConflictError(error);
}

export const SLOT_CONFLICT_MESSAGE = 'This slot was just taken. Please select another time.';

/**
 * Task 71 — raised by `appointments_resource_no_overlap` (same EXCLUDE
 * mechanism as `appointments_no_overlap`, keyed on resource_id instead of
 * calendar_id) when a room/desk/equipment is requested for a time it's
 * already reserved. Postgres's own error message names the constraint, so we
 * can tell the two exclusion violations apart without a second error code.
 */
export function isResourceConflictError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  return e.code === EXCLUSION_VIOLATION && !!e.message?.includes('appointments_resource_no_overlap');
}

export const RESOURCE_CONFLICT_MESSAGE = 'That room or resource is already booked for this time. Please choose another.';
