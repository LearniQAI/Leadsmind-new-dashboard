import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';
import { isEnrolmentActive } from '@/lib/lms/enrolment';
import { getBlockIdsForLesson, getLessonReadingGate, hasLessonReadingCompletion } from '@/lib/lms/lessonBlockTree';

// Core "mark a lesson complete" logic, taking an already-resolved/validated contactId rather
// than resolving it from the current session — this is deliberately NOT a 'use server' export
// (which would let any client call it with an arbitrary contactId and complete lessons for
// other students). It exists so every real completion path (the student's own session via
// markLessonComplete, and server-validated paths like the remedial-assignment grading route
// that already knows which contact it graded) shares one implementation of the per-block
// completion gate, rather than each duplicating — or forgetting — it.
export async function markLessonCompleteForContact(
  workspaceId: string,
  contactId: string,
  courseId: string,
  lessonId: string,
  opts?: {
    /**
     * Student's own "Mark complete" click. The button is always enabled; if content isn't
     * finished the student confirms a soft dialog. With this set, the per-block and reading
     * gates ACCEPT instead of rejecting — and `course_progress.completion_override` is set
     * from the server's OWN re-check (true when a real signal was unmet). The quiz-pass and
     * drip/enrolment gates stay hard. Omitted (system/grading callers) = original behaviour.
     */
    allowIncomplete?: boolean;
  }
): Promise<{ success: true; progressPercentage?: number; override?: boolean } | { error: string }> {
  try {
    const adminClient = createAdminClient();

    // A course_progress row can already exist for this (contact, lesson) pair WITHOUT the
    // lesson being complete: the player heartbeat (PATCH /api/enrolments/:id/activity) inserts
    // a position-tracking row with completed_at:null the first time a video lesson is played.
    // Only a row with completed_at SET means "really complete" — that's the fast-path return.
    // A completed_at:null row must still fall through the completion gate below and then be
    // upgraded (completed_at -> now()), not treated as already done.
    const { data: existing } = await adminClient
      .from('course_progress')
      .select('id, completed_at')
      .eq('contact_id', contactId)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (existing?.completed_at) {
      return { success: true };
    }

    const { data: enrollment } = await adminClient
      .from('enrollments')
      .select('id, status, active, enrolled_at')
      .eq('contact_id', contactId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (!enrollment) return { error: 'Not enrolled in this course' };
    if (!isEnrolmentActive(enrollment)) {
      return { error: 'Your enrolment in this course is no longer active.' };
    }

    const { data: lesson } = await adminClient
      .from('course_lessons')
      .select('id, module_id')
      .eq('id', lessonId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (!lesson) return { error: 'Lesson not found in this course' };

    // Schedule (drip) gate — a lesson still behind its module's enrollment-relative drip
    // offset isn't open to the student, so it can't be marked complete no matter what the
    // block/reading state looks like. Mirrors getLessonLockReason() on the read side and
    // closes the gap where a no-block / no-quiz lesson could be completed while locked.
    if (lesson.module_id && enrollment.enrolled_at) {
      const { data: mod } = await adminClient
        .from('course_modules')
        .select('drip_days')
        .eq('id', lesson.module_id)
        .maybeSingle();

      const dripDays = mod?.drip_days || 0;
      if (dripDays > 0) {
        const unlockTime =
          new Date(enrollment.enrolled_at).getTime() + dripDays * 24 * 60 * 60 * 1000;
        if (Date.now() < unlockTime) {
          return { error: "This lesson hasn't unlocked yet." };
        }
      }
    }

    // Phase C: a lesson built from content_blocks can only be marked complete once every
    // block has a real lesson_block_completions row for this student. Part 2: for a lesson
    // with a Lesson Builder canvas, "every block" means every block still actually placed on
    // the tree (see getBlockIdsForLesson) — not every content_blocks row that happens to
    // still exist for this lesson_id, which could include one orphaned by a bulk
    // Section/Row deletion that removed it from the canvas without deleting its row.
    // Independent server-side re-check of the "soft" completion signals (per-block
    // completions, reading/scroll gate). When `allowIncomplete` is set (the student's own
    // click, having confirmed the soft dialog) these no longer reject — instead an unmet
    // signal is recorded as `completion_override = true`. The quiz-pass and drip/enrolment
    // gates above/below stay hard for everyone.
    let completionOverride = false;

    const blockIds = await getBlockIdsForLesson(adminClient, lessonId);

    if (blockIds.length > 0) {
      const { data: completions } = await adminClient
        .from('lesson_block_completions')
        .select('content_block_id')
        .eq('contact_id', contactId)
        .in('content_block_id', blockIds);

      const completedCount = new Set((completions || []).map((c) => c.content_block_id)).size;
      if (completedCount < blockIds.length) {
        if (!opts?.allowIncomplete) {
          return { error: `Complete every block in this lesson first (${completedCount}/${blockIds.length} done)` };
        }
        completionOverride = true;
      }
    } else {
      const { data: quizQuestions } = await adminClient
        .from('quiz_questions')
        .select('id')
        .eq('lesson_id', lessonId)
        .limit(1);

      if (quizQuestions && quizQuestions.length > 0) {
        const { data: passedAttempt } = await adminClient
          .from('quiz_attempts')
          .select('id')
          .eq('student_id', contactId)
          .eq('lesson_id', lessonId)
          .eq('passed', true)
          .maybeSingle();

        // Assessment integrity: a quiz must actually be passed — NOT overridable.
        if (!passedAttempt) return { error: 'This lesson requires passing its quiz first' };
      }

      // A canvas lesson made entirely of inline content (heading/rich-text/image) with no
      // trackable blocks has no other completion signal — require the reading gate
      // (scrolled through + minimum dwell), recorded in lesson_reading_completions.
      const readingGate = await getLessonReadingGate(adminClient, lessonId);
      if (readingGate.required) {
        const readDone = await hasLessonReadingCompletion(adminClient, lessonId, contactId);
        if (!readDone) {
          if (!opts?.allowIncomplete) {
            return { error: 'Read through the full lesson before marking it complete.' };
          }
          completionOverride = true;
        }
      }
    }

    // No row yet -> insert one (completed_at defaults to now()). A completed_at:null
    // position-tracking row already exists -> upgrade it in place to a real completion,
    // preserving its progress_seconds. The unique index on (contact_id, lesson_id) means an
    // insert here would otherwise conflict.
    const { error } = existing
      ? await adminClient
          .from('course_progress')
          .update({ completed_at: new Date().toISOString(), completion_override: completionOverride })
          .eq('id', existing.id)
      : await adminClient
          .from('course_progress')
          .insert({
            workspace_id: workspaceId,
            contact_id: contactId,
            course_id: courseId,
            lesson_id: lessonId,
            completion_override: completionOverride
          });

    if (error) throw error;

    try {
      const { publishEvent } = await import('@/lib/events/EventBus');
      // LMS automation event bus (lms_automation_rules) is a SEPARATE engine from the CRM
      // EventBus/triggerWorkflows above — the course Automations tab reads only the former.
      // Every branch below is reached exactly once per genuine completion: the
      // `existing?.completed_at` fast-path return near the top of this function means a
      // lesson that is already complete never re-enters this block, so re-opening the
      // player or re-marking a done lesson does not re-fire any of these.
      const { emitLMSEvent } = await import('../../../libs/core/src/events/lms-event-bus');

      await publishEvent(workspaceId, 'lesson_completed', contactId, { courseId, lessonId });
      await emitLMSEvent('lesson_completed', { workspaceId, contactId, courseId, lessonId });

      const { data: lessonRow } = await adminClient
        .from('course_lessons')
        .select('module_id')
        .eq('id', lessonId)
        .single();

      if (lessonRow?.module_id) {
        const { data: moduleLessons } = await adminClient
          .from('course_lessons')
          .select('id')
          .eq('module_id', lessonRow.module_id);

        const { data: completedLessons } = await adminClient
          .from('course_progress')
          .select('lesson_id')
          .eq('contact_id', contactId)
          .eq('course_id', courseId)
          .not('completed_at', 'is', null)
          .in('lesson_id', (moduleLessons || []).map((l) => l.id));

        // This test runs only inside the "first completion of this lesson" pass, so it is
        // true exactly on the completion that takes the module from partial -> 100%.
        if (completedLessons && completedLessons.length === moduleLessons?.length) {
          await publishEvent(workspaceId, 'module_completed', contactId, { courseId, moduleId: lessonRow.module_id });
          await emitLMSEvent('module_completed', { workspaceId, contactId, courseId, moduleId: lessonRow.module_id });
        }
      }

      const { data: allCourseLessons } = await adminClient
        .from('course_lessons')
        .select('id')
        .eq('course_id', courseId);

      const { data: allCompletedCourseLessons } = await adminClient
        .from('course_progress')
        .select('lesson_id')
        .eq('contact_id', contactId)
        .eq('course_id', courseId)
        .not('completed_at', 'is', null);

      // Same guarantee: true exactly on the completion that takes the course to 100%.
      // This is the same real trigger point the certificate auto-eligibility check uses.
      if (allCompletedCourseLessons && allCompletedCourseLessons.length === allCourseLessons?.length) {
        await publishEvent(workspaceId, 'course_completed', contactId, { courseId });
        await emitLMSEvent('course_completed', { workspaceId, contactId, courseId });
      }
    } catch (telemetryErr) {
      logger.error({ err: telemetryErr, workspaceId, contactId, courseId }, 'complete_lesson.telemetry_hook.failed');
    }

    const { data: allLessons } = await adminClient
      .from('course_lessons')
      .select('id')
      .eq('course_id', courseId);

    const { data: allCompleted } = await adminClient
      .from('course_progress')
      .select('lesson_id')
      .eq('contact_id', contactId)
      .eq('course_id', courseId)
      .not('completed_at', 'is', null);

    const total = allLessons?.length || 0;
    const completed = allCompleted?.length || 0;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    try {
      const { evaluateStudentStruggle } = await import('../../../libs/core/src/analytics/struggle-processor');
      await evaluateStudentStruggle(contactId, courseId, workspaceId);
    } catch (struggleErr) {
      logger.error({ err: struggleErr, workspaceId, contactId, courseId }, 'complete_lesson.struggle_processor.failed');
    }

    return { success: true, progressPercentage: percentage, override: completionOverride };
  } catch (err: any) {
    logger.error({ err, workspaceId, contactId, courseId, lessonId }, 'complete_lesson.failed');
    return { error: 'Failed to mark lesson complete.' };
  }
}
