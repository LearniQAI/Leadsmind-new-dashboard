import type { SupabaseClient } from '@supabase/supabase-js';

// Cohorts, Part 1 — shared read/guard helpers. The DB trigger enforce_cohort_seat_cap
// (migration 20260903000031) is the authoritative seat guard; these run BEFORE it so a
// student is told "this cohort is full" before anything charges them, and so any real cohort
// picker only ever shows genuinely-open cohorts.

// An enrolment in one of these statuses is not holding a live seat.
const RELEASED_STATUSES = ['cancelled', 'canceled', 'rejected', 'revoked', 'expired', 'inactive'];

export interface CohortWithSeats {
  id: string;
  course_id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  seat_cap: number;
  seats_taken: number;
  seats_left: number;
  is_full: boolean;
  has_enrollments: boolean;
}

async function seatsTaken(admin: SupabaseClient, cohortId: string): Promise<number> {
  const { count } = await admin
    .from('enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('cohort_id', cohortId)
    .not('status', 'in', `(${RELEASED_STATUSES.join(',')})`);
  return count ?? 0;
}

/** All cohorts for a course with live seat counts (admin view). */
export async function listCohortsWithSeats(
  admin: SupabaseClient,
  courseId: string
): Promise<CohortWithSeats[]> {
  const { data: cohorts } = await admin
    .from('course_cohorts')
    .select('id, course_id, name, start_date, end_date, seat_cap')
    .eq('course_id', courseId)
    .order('start_date', { ascending: true });

  const rows: CohortWithSeats[] = [];
  for (const c of cohorts || []) {
    const taken = await seatsTaken(admin, c.id);
    rows.push({
      ...c,
      seats_taken: taken,
      seats_left: Math.max(0, c.seat_cap - taken),
      is_full: taken >= c.seat_cap,
      has_enrollments: taken > 0,
    });
  }
  return rows;
}

/** Only cohorts a new student can still join — used by the student-facing picker. */
export async function listOpenCohortsForCourse(
  admin: SupabaseClient,
  courseId: string
): Promise<CohortWithSeats[]> {
  return (await listCohortsWithSeats(admin, courseId)).filter((c) => !c.is_full);
}

/**
 * Pre-check before an enrolment write. Returns { ok:false, reason } instead of throwing so
 * callers can surface a clean message; the DB trigger still backstops a race.
 */
// Flat (non-discriminated) result shape on purpose: this codebase compiles with
// strictNullChecks off, where `ok: true | false` discriminated-union narrowing does not work,
// so callers read `reason` directly after an `!ok` check.
export interface CohortSeatCheck {
  ok: boolean;
  reason?: string;
  cohort?: { id: string; name: string; seat_cap: number };
}

export async function checkCohortSeatAvailable(
  admin: SupabaseClient,
  cohortId: string,
  courseId?: string
): Promise<CohortSeatCheck> {
  const { data: cohort } = await admin
    .from('course_cohorts')
    .select('id, name, seat_cap, course_id')
    .eq('id', cohortId)
    .maybeSingle();

  if (!cohort) return { ok: false, reason: 'That cohort no longer exists.' };
  if (courseId && cohort.course_id !== courseId) {
    return { ok: false, reason: 'That cohort belongs to a different course.' };
  }
  const taken = await seatsTaken(admin, cohortId);
  if (taken >= cohort.seat_cap) {
    return { ok: false, reason: `The "${cohort.name}" cohort is full.` };
  }
  return { ok: true, cohort: { id: cohort.id, name: cohort.name, seat_cap: cohort.seat_cap } };
}

/** True if any live enrolment references this cohort — start_date/seat_cap become locked. */
export async function cohortHasEnrollments(admin: SupabaseClient, cohortId: string): Promise<boolean> {
  return (await seatsTaken(admin, cohortId)) > 0;
}

/** Postgres raised our seat-cap guard. */
export function isCohortFullError(err: any): boolean {
  return typeof err?.message === 'string' && err.message.includes('cohort_full');
}
