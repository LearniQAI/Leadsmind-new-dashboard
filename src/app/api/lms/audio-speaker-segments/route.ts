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

// Deferred from Phase 1 (table existed, no UI/API needed it yet — see that phase's report) —
// this is what the Phase 3 Speaker Timeline Editor reads/writes to drive active-speaker
// highlighting.
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
      .from('audio_speaker_segments')
      .select('*')
      .eq('content_block_id', contentBlockId)
      .order('sequence', { ascending: true });
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    logger.error({ err }, 'lms.audio_speaker_segments.list.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const body = await req.json();
    const { content_block_id, speaker_id = null, start_time_ms, end_time_ms, sequence = 0 } = body;
    if (!content_block_id || start_time_ms == null || end_time_ms == null) {
      return NextResponse.json(
        { error: 'Missing required fields: content_block_id, start_time_ms, end_time_ms' },
        { status: 400 }
      );
    }
    if (end_time_ms <= start_time_ms) {
      return NextResponse.json({ error: 'end_time_ms must be greater than start_time_ms' }, { status: 400 });
    }
    if (!(await ownedBlockId(adminClient, content_block_id, workspaceId))) throw new NotFoundError('Content block');

    const { data, error } = await adminClient
      .from('audio_speaker_segments')
      .insert({ content_block_id, speaker_id, start_time_ms, end_time_ms, sequence })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    logger.error({ err }, 'lms.audio_speaker_segments.create.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
