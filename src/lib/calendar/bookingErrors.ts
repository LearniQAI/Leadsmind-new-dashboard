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
  return !!error && typeof error === 'object' && (error as { code?: string }).code === EXCLUSION_VIOLATION;
}

export const SLOT_CONFLICT_MESSAGE = 'This slot was just taken. Please select another time.';
