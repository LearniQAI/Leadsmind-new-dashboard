import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { requireLmsInstructor } from '@/lib/lms/access';
import { getOrCreateStudentContact } from '@/app/actions/studentEnrollments';
import { createAdminClient } from '@/lib/supabase/server';
import { toClientError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { runCreditGuard, consumeAICredit } from '@/lib/ai/creditGuard';
import { extractLessonText } from '@/lib/lms/chunking';
import { processLessonSummary } from '@/lib/lms/summaryPipeline';

export const dynamic = 'force-dynamic';

const REGENERATE_COOLDOWN_MS = 15 * 1000; // single completion call, same class of cost as course-qa's per-question cooldown

async function fetchLesson(lessonId: string) {
  const adminClient = createAdminClient();
  const { data: lesson, error } = await adminClient
    .from('course_lessons')
    .select('id, course_id, workspace_id, title, lesson_type, content')
    .eq('id', lessonId)
    .maybeSingle();
  if (error) throw error;
  return lesson;
}

/** Instructor (own workspace) OR enrolled student — same dual-access shape
 * the rest of the LMS student-facing surface uses. Never trusts the caller;
 * always re-derives from the real session. */
async function assertReadAccess(lesson: { id: string; course_id: string; workspace_id: string }) {
  try {
    const { workspaceId } = await requireLmsInstructor();
    if (workspaceId === lesson.workspace_id) return;
  } catch {
    // not an instructor for this workspace — fall through to the student check
  }

  const contactId = await getOrCreateStudentContact(lesson.workspace_id);
  if (!contactId) throw new ForbiddenError('You do not have access to this lesson');

  const adminClient = createAdminClient();
  const { data: enrollment, error } = await adminClient
    .from('enrollments')
    .select('id')
    .eq('course_id', lesson.course_id)
    .eq('contact_id', contactId)
    .maybeSingle();
  if (error) throw error;
  if (!enrollment) throw new ForbiddenError('You are not enrolled in this course');
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) throw new UnauthorizedError();

    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get('lessonId');
    if (!lessonId) throw new ValidationError('Missing lessonId');

    const lesson = await fetchLesson(lessonId);
    if (!lesson) throw new NotFoundError('Lesson');

    await assertReadAccess(lesson);

    const adminClient = createAdminClient();
    const { data: summary, error } = await adminClient
      .from('lesson_summaries')
      .select('*')
      .eq('lesson_id', lessonId)
      .maybeSingle();
    if (error) throw error;

    return NextResponse.json({
      summary: summary ?? null,
      hasSummarizableContent: extractLessonText(lesson) !== null,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'lms.lesson_summary.get.failed');
    const clientError = toClientError(error);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get('lessonId');
    if (!lessonId) throw new ValidationError('Missing lessonId');

    const { workspaceId } = await requireLmsInstructor();

    const lesson = await fetchLesson(lessonId);
    if (!lesson) throw new NotFoundError('Lesson');
    if (lesson.workspace_id !== workspaceId) throw new ForbiddenError('You do not have access to this lesson');

    const text = extractLessonText(lesson);
    if (!text) {
      return NextResponse.json(
        { error: 'This lesson has no text content to summarize.', code: 'NO_CONTENT' },
        { status: 422 }
      );
    }

    const adminClient = createAdminClient();

    // Server-side per-lesson cooldown on the explicit manual regenerate action.
    const { data: existing, error: existingError } = await adminClient
      .from('lesson_summaries')
      .select('updated_at')
      .eq('lesson_id', lessonId)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing) {
      const elapsedMs = Date.now() - new Date(existing.updated_at).getTime();
      if (elapsedMs < REGENERATE_COOLDOWN_MS) {
        const retryAfterSeconds = Math.ceil((REGENERATE_COOLDOWN_MS - elapsedMs) / 1000);
        return NextResponse.json(
          { error: 'This summary was just regenerated. Please wait before trying again.', code: 'COOLDOWN_ACTIVE', retryAfterSeconds },
          { status: 429 }
        );
      }
    }

    const guardResult = await runCreditGuard(workspaceId);
    if (guardResult.ok === false) {
      return NextResponse.json(guardResult.body as object, { status: guardResult.status });
    }

    const result = await processLessonSummary(lessonId, true);
    if (result.status === 'failed') {
      return NextResponse.json({ error: result.error, code: 'SUMMARY_GENERATION_FAILED' }, { status: 502 });
    }

    await consumeAICredit(workspaceId, 1);

    const { data: summary, error: fetchError } = await adminClient
      .from('lesson_summaries')
      .select('*')
      .eq('lesson_id', lessonId)
      .maybeSingle();
    if (fetchError) throw fetchError;

    return NextResponse.json({ summary });
  } catch (error: any) {
    logger.error({ err: error }, 'lms.lesson_summary.regenerate.failed');
    const clientError = toClientError(error);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
