import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { ForbiddenError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Module-Level Quiz — mirrors /api/lms/quiz/settings exactly, module_id in place of
// lesson_id, ownership resolved via course_modules instead of course_lessons.
async function assertModuleInWorkspace(adminClient: ReturnType<typeof createAdminClient>, moduleId: string, workspaceId: string) {
  const { data: moduleRow, error } = await adminClient
    .from('course_modules')
    .select('id')
    .eq('id', moduleId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) throw error;
  if (!moduleRow) throw new ForbiddenError('You do not have access to this module');
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const moduleId = searchParams.get('moduleId');
    if (!moduleId) return NextResponse.json({ error: 'Missing moduleId parameter' }, { status: 400 });

    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();
    await assertModuleInWorkspace(adminClient, moduleId, workspaceId);

    const { data: settings, error } = await adminClient
      .from('module_quiz_settings')
      .select('*')
      .eq('module_id', moduleId)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ data: settings });
  } catch (err: any) {
    logger.error({ err }, 'lms.module_quiz_settings.get.failed');
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
      module_id,
      time_limit_minutes = null,
      max_attempts = 3,
      pass_percentage = 70,
      show_answers_after = 'submission',
      randomize_questions = false,
      publish_status = 'draft',
      scheduled_at = null
    } = body;

    if (!module_id) {
      return NextResponse.json({ error: 'Missing required field: module_id' }, { status: 400 });
    }

    await assertModuleInWorkspace(adminClient, module_id, workspaceId);

    const payload = {
      module_id,
      time_limit_minutes,
      max_attempts,
      pass_percentage,
      show_answers_after,
      randomize_questions,
      publish_status,
      scheduled_at
    };

    const { data: settings, error } = await adminClient
      .from('module_quiz_settings')
      .upsert(payload, { onConflict: 'module_id' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data: settings });
  } catch (err: any) {
    logger.error({ err }, 'lms.module_quiz_settings.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function PATCH(req: NextRequest) {
  return POST(req);
}
