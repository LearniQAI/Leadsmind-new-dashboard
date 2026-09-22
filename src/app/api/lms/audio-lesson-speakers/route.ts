import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

async function ownedBlockId(
  adminClient: ReturnType<typeof createAdminClient>,
  contentBlockId: string,
  workspaceId: string
) {
  const { data, error } = await adminClient
    .from('content_blocks')
    .select('id, course_lessons!inner(workspace_id)')
    .eq('id', contentBlockId)
    .eq('course_lessons.workspace_id', workspaceId)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contentBlockId = searchParams.get('contentBlockId');
    if (!contentBlockId) {
      return NextResponse.json({ error: 'Missing contentBlockId parameter' }, { status: 400 });
    }
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    if (!(await ownedBlockId(adminClient, contentBlockId, workspaceId))) throw new NotFoundError('Content block');

    const { data, error } = await adminClient
      .from('audio_lesson_speakers')
      .select('*, speakers(*)')
      .eq('content_block_id', contentBlockId)
      .order('display_order', { ascending: true });
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    logger.error({ err }, 'lms.audio_lesson_speakers.list.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const body = await req.json();
    const { content_block_id, speaker_id, display_order = 0 } = body;
    if (!content_block_id || !speaker_id) {
      return NextResponse.json({ error: 'Missing required fields: content_block_id, speaker_id' }, { status: 400 });
    }
    if (!(await ownedBlockId(adminClient, content_block_id, workspaceId))) throw new NotFoundError('Content block');

    const { data: speaker } = await adminClient
      .from('speakers')
      .select('id')
      .eq('id', speaker_id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (!speaker) throw new NotFoundError('Speaker');

    const { data, error } = await adminClient
      .from('audio_lesson_speakers')
      .upsert(
        { content_block_id, speaker_id, display_order },
        { onConflict: 'content_block_id,speaker_id' }
      )
      .select('*, speakers(*)')
      .single();
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    logger.error({ err }, 'lms.audio_lesson_speakers.create.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
