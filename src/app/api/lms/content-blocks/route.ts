import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { ForbiddenError, NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { isSafeEmbedUrl } from '@/lib/security/isSafeEmbedUrl';

export const dynamic = 'force-dynamic';

const BLOCK_TYPES = [
  'video', 'audio', 'reading', 'rich_text', 'quiz', 'assignment',
  'flashcards', 'download', 'slides', 'embed', 'live_session', 'html_code'
];

// Real per-type completion default (Phase C) — every block type gets a completion condition
// that's actually meaningful for it, rather than every new block silently defaulting to
// 'none' (which would let it satisfy the Next-button gate without any real interaction).
const DEFAULT_COMPLETION_RULE: Record<string, { rule: string; threshold: number | null }> = {
  video: { rule: 'watched_threshold', threshold: 90 },
  audio: { rule: 'watched_threshold', threshold: 90 },
  reading: { rule: 'opened', threshold: null },
  slides: { rule: 'opened', threshold: null },
  quiz: { rule: 'quiz_passed', threshold: null },
  assignment: { rule: 'graded_passed', threshold: null },
  flashcards: { rule: 'opened', threshold: null },
  rich_text: { rule: 'none', threshold: null },
  download: { rule: 'none', threshold: null },
  embed: { rule: 'none', threshold: null },
  live_session: { rule: 'none', threshold: null },
  // Generic non-interactive HTML — auto-satisfied on render, same as rich_text. The pasted
  // markup can't be meaningfully "completed", and requiring an explicit click would just be
  // a fake gate.
  html_code: { rule: 'none', threshold: null }
};

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
      completion_rule,
      completion_threshold,
      content = {}
    } = body;

    if (!lesson_id || !type) {
      return NextResponse.json({ error: 'Missing required fields: lesson_id, type' }, { status: 400 });
    }
    if (!BLOCK_TYPES.includes(type)) {
      return NextResponse.json({ error: `Invalid block type: ${type}` }, { status: 400 });
    }

    // Same server-side embed-url guard as the PATCH route (see that file's comment) — applied
    // here too since a block can in principle be created with content already attached.
    if (type === 'embed' && content?.embed_url && !isSafeEmbedUrl(content.embed_url)) {
      return NextResponse.json({ error: 'Only http(s) links are allowed in an embed.' }, { status: 400 });
    }

    const defaults = DEFAULT_COMPLETION_RULE[type];
    const resolvedCompletionRule = completion_rule ?? defaults.rule;
    const resolvedCompletionThreshold = completion_threshold ?? defaults.threshold;

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
        completion_rule: resolvedCompletionRule,
        completion_threshold: resolvedCompletionThreshold,
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
