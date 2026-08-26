import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { ForbiddenError, NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

const BLOCK_TYPES = [
  'video', 'audio', 'reading', 'rich_text', 'quiz', 'assignment',
  'flashcards', 'download', 'slides', 'embed', 'live_session'
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get('lessonId');
    if (!lessonId) {
      return NextResponse.json({ error: 'Missing lessonId parameter' }, { status: 400 });
    }

    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { data: lesson, error: lessonErr } = await adminClient
      .from('course_lessons')
      .select('id')
      .eq('id', lessonId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (lessonErr) throw lessonErr;
    if (!lesson) throw new NotFoundError('Lesson');

    const { data: blocks, error } = await adminClient
      .from('content_blocks')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('position', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ data: blocks });
  } catch (err: any) {
    logger.error({ err }, 'lms.content-blocks.get.failed');
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
      type,
      video_provider = null,
      file_url = null,
      completion_rule = 'none',
      completion_threshold = null,
      content = {}
    } = body;

    if (!lesson_id || !type) {
      return NextResponse.json({ error: 'Missing required fields: lesson_id, type' }, { status: 400 });
    }
    if (!BLOCK_TYPES.includes(type)) {
      return NextResponse.json({ error: `Invalid block type: ${type}` }, { status: 400 });
    }

    // Verify the target lesson actually belongs to the caller's own workspace
    // before attaching a block to it — lesson_id is never trusted blindly.
    const { data: lessonRow, error: lessonErr } = await adminClient
      .from('course_lessons')
      .select('id')
      .eq('id', lesson_id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (lessonErr) throw lessonErr;
    if (!lessonRow) throw new ForbiddenError('You do not have access to this lesson');

    const { count } = await adminClient
      .from('content_blocks')
      .select('id', { count: 'exact', head: true })
      .eq('lesson_id', lesson_id);

    const { data: block, error } = await adminClient
      .from('content_blocks')
      .insert({
        lesson_id,
        position: count || 0,
        type,
        video_provider,
        file_url,
        completion_rule,
        completion_threshold,
        content
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data: block });
  } catch (err: any) {
    logger.error({ err }, 'lms.content-blocks.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
