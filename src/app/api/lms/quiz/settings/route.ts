import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { ForbiddenError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// quiz_settings has no workspace_id column of its own — ownership is resolved via the
// lesson it belongs to (course_lessons.workspace_id).
async function assertLessonInWorkspace(adminClient: ReturnType<typeof createAdminClient>, lessonId: string, workspaceId: string) {
  const { data: lessonRow, error } = await adminClient
    .from('course_lessons')
    .select('id')
    .eq('id', lessonId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) throw error;
  if (!lessonRow) throw new ForbiddenError('You do not have access to this lesson');
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get('lessonId');
    if (!lessonId) return NextResponse.json({ error: 'Missing lessonId parameter' }, { status: 400 });

    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();
    await assertLessonInWorkspace(adminClient, lessonId, workspaceId);

    const { data: settings, error } = await adminClient
      .from('quiz_settings')
      .select('*')
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ data: settings });
  } catch (err: any) {
    logger.error({ err }, 'lms.quiz_settings.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const body = await req.json();
    const {
      lesson_id,
      time_limit_minutes = null,
      max_attempts = 3,
      pass_percentage = 70,
      show_answers_after = 'submission',
      randomize_questions = false,
      publish_status = 'draft',
      scheduled_at = null
    } = body;

    if (!lesson_id) {
      return NextResponse.json({ error: 'Missing required field: lesson_id' }, { status: 400 });
    }

    await assertLessonInWorkspace(adminClient, lesson_id, workspaceId);

    const payload = {
      lesson_id,
      time_limit_minutes,
      max_attempts,
      pass_percentage,
      show_answers_after,
      randomize_questions,
      publish_status,
      scheduled_at
    };

    const { data: settings, error } = await adminClient
      .from('quiz_settings')
      .upsert(payload, { onConflict: 'lesson_id' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data: settings });
  } catch (err: any) {
    logger.error({ err }, 'lms.quiz_settings.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function PATCH(req: NextRequest) {
  // Same auth/ownership checks apply — POST is an upsert on lesson_id anyway.
  return POST(req);
}
