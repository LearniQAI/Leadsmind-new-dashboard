import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { isSafeEmbedUrl } from '@/lib/security/isSafeEmbedUrl';

export const dynamic = 'force-dynamic';

const BLOCK_TYPES = [
  'video', 'audio', 'reading', 'rich_text', 'quiz', 'assignment',
  'flashcards', 'download', 'slides', 'embed', 'live_session', 'html_code'
];

async function getOwnedBlock(adminClient: ReturnType<typeof createAdminClient>, id: string, workspaceId: string) {
  const { data: block, error } = await adminClient
    .from('content_blocks')
    .select('id, lesson_id, type, course_lessons!inner(workspace_id)')
    .eq('id', id)
    .eq('course_lessons.workspace_id', workspaceId)
    .maybeSingle();
  if (error) throw error;
  return block;
}

// Real single-block lookup (Lesson Builder Part 2) — the canvas wrapper node only carries a
// blockId in its serialized props; the real block data (video_provider, file_url,
// completion_rule, etc.) stays in content_blocks, fetched here rather than duplicated into
// the Craft.js tree, per Part 2 Step 1's architecture decision.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { data: block, error } = await adminClient
      .from('content_blocks')
      .select('*, course_lessons!inner(workspace_id)')
      .eq('id', id)
      .eq('course_lessons.workspace_id', workspaceId)
      .maybeSingle();

    if (error) throw error;
    if (!block) throw new NotFoundError('Content block');

    const { course_lessons, ...cleanBlock } = block as any;
    return NextResponse.json({ data: cleanBlock });
  } catch (err: any) {
    logger.error({ err }, 'lms.content-blocks.get_by_id.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const owned = await getOwnedBlock(adminClient, id, workspaceId);
    if (!owned) throw new NotFoundError('Content block');

    const body = await req.json();
    const { type, video_provider, file_url, completion_rule, completion_threshold, content, position } = body;

    if (type !== undefined && !BLOCK_TYPES.includes(type)) {
      return NextResponse.json({ error: `Invalid block type: ${type}` }, { status: 400 });
    }

    // Real gap found during the "Consistent Premium Settings Panels" pass: isSafeEmbedUrl was
    // only ever enforced client-side (EmbedBlockEditor's onBlur) — this API happily persisted a
    // javascript:/data: embed_url. The student player also re-checks before rendering an
    // iframe, so this wasn't directly exploitable end-to-end, but the write path itself had no
    // guard, which is exactly the safety check the master prompt named. Enforced here too, for
    // both an explicit type: 'embed' and an existing embed block being patched without type.
    const resolvedType = type !== undefined ? type : (owned as any).type;
    if (content?.embed_url !== undefined && resolvedType === 'embed' && content.embed_url) {
      if (!isSafeEmbedUrl(content.embed_url)) {
        return NextResponse.json({ error: 'Only http(s) links are allowed in an embed.' }, { status: 400 });
      }
    }

    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (type !== undefined) updatePayload.type = type;
    if (video_provider !== undefined) updatePayload.video_provider = video_provider;
    if (file_url !== undefined) updatePayload.file_url = file_url;
    if (completion_rule !== undefined) updatePayload.completion_rule = completion_rule;
    if (completion_threshold !== undefined) updatePayload.completion_threshold = completion_threshold;
    if (content !== undefined) updatePayload.content = content;
    if (position !== undefined) updatePayload.position = position;

    const { data: block, error } = await adminClient
      .from('content_blocks')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data: block });
  } catch (err: any) {
    logger.error({ err }, 'lms.content-blocks.patch.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const owned = await getOwnedBlock(adminClient, id, workspaceId);
    if (!owned) throw new NotFoundError('Content block');

    const { error } = await adminClient
      .from('content_blocks')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'lms.content-blocks.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
