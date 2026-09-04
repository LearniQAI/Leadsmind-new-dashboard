'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { logger } from '@/shared/logger';
import { toClientError } from '@/shared/errors/AppError';
import { listCohortsWithSeats, listOpenCohortsForCourse, cohortHasEnrollments } from '@/lib/lms/cohorts';

/**
 * Student-facing: the currently-open (not full) cohorts for a course. No instructor gate —
 * a prospective student needs this to pick a cohort during enrolment. Returns nothing unless
 * the course actually has cohorts enabled.
 */
export async function getOpenCohorts(courseId: string) {
  try {
    const admin = createAdminClient();
    const { data: course } = await admin
      .from('courses')
      .select('id, cohorts_enabled')
      .eq('id', courseId)
      .maybeSingle();
    if (!course?.cohorts_enabled) return { data: [] as any[], cohortsEnabled: false };
    const open = await listOpenCohortsForCourse(admin, courseId);
    return {
      data: open.map((c) => ({
        id: c.id,
        name: c.name,
        start_date: c.start_date,
        end_date: c.end_date,
        seats_left: c.seats_left,
      })),
      cohortsEnabled: true,
    };
  } catch (err: any) {
    logger.error({ err, courseId }, 'course_cohorts.open.failed');
    return { data: [] as any[], cohortsEnabled: false, error: toClientError(err).error };
  }
}

// Cohorts, Part 1 — admin CRUD. Lifecycle rule (Step 1): name + end_date editable anytime;
// start_date + seat_cap editable only while the cohort has ZERO live enrollments (so an
// already-scheduled group can't be silently re-timed or shrunk); delete only while zero
// enrollments (deleting a cohort with students would strand them).

async function assertCourseAccess(courseId: string) {
  const { workspaceId } = await requireLmsInstructor();
  const admin = createAdminClient();
  const { data: course } = await admin
    .from('courses')
    .select('id, workspace_id')
    .eq('id', courseId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  if (!course) throw new Error('Course not found or not in your workspace.');
  return { workspaceId, admin };
}

export async function listCohorts(courseId: string) {
  try {
    const { admin } = await assertCourseAccess(courseId);
    const cohorts = await listCohortsWithSeats(admin, courseId);
    return { data: cohorts };
  } catch (err: any) {
    logger.error({ err, courseId }, 'course_cohorts.list.failed');
    return { error: toClientError(err).error };
  }
}

export async function setCohortsEnabled(courseId: string, enabled: boolean) {
  try {
    const { admin, workspaceId } = await assertCourseAccess(courseId);
    const { error } = await admin
      .from('courses')
      .update({ cohorts_enabled: !!enabled })
      .eq('id', courseId)
      .eq('workspace_id', workspaceId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    logger.error({ err, courseId }, 'course_cohorts.toggle.failed');
    return { error: toClientError(err).error };
  }
}

function validateLifecycleInput(p: { name?: string; start_date?: string; end_date?: string | null; seat_cap?: number }) {
  if (p.name !== undefined && !p.name.trim()) return 'Cohort name is required.';
  if (p.seat_cap !== undefined && (!Number.isInteger(p.seat_cap) || p.seat_cap < 1)) {
    return 'Seat cap must be a whole number, 1 or more.';
  }
  if (p.start_date !== undefined && isNaN(Date.parse(p.start_date))) return 'Start date is invalid.';
  if (p.end_date != null && p.end_date !== '' && isNaN(Date.parse(p.end_date))) return 'End date is invalid.';
  if (
    p.start_date && p.end_date && p.end_date !== '' &&
    Date.parse(p.end_date) <= Date.parse(p.start_date)
  ) {
    return 'End date must be after the start date.';
  }
  return null;
}

export async function createCohort(
  courseId: string,
  input: { name: string; start_date: string; end_date?: string | null; seat_cap: number }
) {
  try {
    const { admin, workspaceId } = await assertCourseAccess(courseId);
    const bad = validateLifecycleInput(input);
    if (bad) return { error: bad };

    const { data, error } = await admin
      .from('course_cohorts')
      .insert({
        course_id: courseId,
        workspace_id: workspaceId,
        name: input.name.trim(),
        start_date: new Date(input.start_date).toISOString(),
        end_date: input.end_date ? new Date(input.end_date).toISOString() : null,
        seat_cap: input.seat_cap,
      })
      .select()
      .single();
    if (error) throw error;
    return { data };
  } catch (err: any) {
    logger.error({ err, courseId }, 'course_cohorts.create.failed');
    return { error: toClientError(err).error };
  }
}

export async function updateCohort(
  cohortId: string,
  patch: { name?: string; start_date?: string; end_date?: string | null; seat_cap?: number }
) {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const admin = createAdminClient();
    const { data: cohort } = await admin
      .from('course_cohorts')
      .select('id, workspace_id, seat_cap')
      .eq('id', cohortId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (!cohort) return { error: 'Cohort not found or not in your workspace.' };

    const bad = validateLifecycleInput(patch);
    if (bad) return { error: bad };

    const locked = await cohortHasEnrollments(admin, cohortId);
    const wantsLockedChange =
      patch.start_date !== undefined || (patch.seat_cap !== undefined && patch.seat_cap !== cohort.seat_cap);
    if (locked && wantsLockedChange) {
      return { error: 'Students are already enrolled — start date and seat cap can no longer be changed. Name and end date can still be edited.' };
    }

    const update: Record<string, any> = {};
    if (patch.name !== undefined) update.name = patch.name.trim();
    if (patch.end_date !== undefined) update.end_date = patch.end_date ? new Date(patch.end_date).toISOString() : null;
    if (!locked && patch.start_date !== undefined) update.start_date = new Date(patch.start_date).toISOString();
    if (!locked && patch.seat_cap !== undefined) update.seat_cap = patch.seat_cap;

    if (Object.keys(update).length === 0) return { success: true };

    const { data, error } = await admin
      .from('course_cohorts')
      .update(update)
      .eq('id', cohortId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();
    if (error) throw error;
    return { data };
  } catch (err: any) {
    logger.error({ err, cohortId }, 'course_cohorts.update.failed');
    return { error: toClientError(err).error };
  }
}

export async function deleteCohort(cohortId: string) {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const admin = createAdminClient();
    const { data: cohort } = await admin
      .from('course_cohorts')
      .select('id, workspace_id')
      .eq('id', cohortId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (!cohort) return { error: 'Cohort not found or not in your workspace.' };

    if (await cohortHasEnrollments(admin, cohortId)) {
      return { error: 'This cohort has enrolled students and cannot be deleted.' };
    }
    const { error } = await admin
      .from('course_cohorts')
      .delete()
      .eq('id', cohortId)
      .eq('workspace_id', workspaceId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    logger.error({ err, cohortId }, 'course_cohorts.delete.failed');
    return { error: toClientError(err).error };
  }
}
