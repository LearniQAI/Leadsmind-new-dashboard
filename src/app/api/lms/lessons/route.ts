import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { ForbiddenError, NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { processLessonForRAG } from '@/lib/lms/ragPipeline';
import { processLessonSummary } from '@/lib/lms/summaryPipeline';
import { getLessonTemplateById, BLANK_LESSON_CANVAS } from '@/lib/builder/lessonTemplates';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const moduleId = searchParams.get('moduleId');
    const id = searchParams.get('id');

    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    if (id) {
      const { data: lesson, error } = await adminClient
        .from('course_lessons')
        .select('*')
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .single();

      if (error || !lesson) throw new NotFoundError('Lesson');
      return NextResponse.json({ data: lesson });
    }

    if (!moduleId) {
      return NextResponse.json({ error: 'Missing moduleId or id parameter' }, { status: 400 });
    }

    const { data: lessons, error } = await adminClient
      .from('course_lessons')
      .select('*')
      .eq('module_id', moduleId)
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ data: lessons });
  } catch (err: any) {
    logger.error({ err }, 'lms.lessons.get.failed');
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
      course_id,
      title,
      lesson_type,
      content = {},
      position = 0,
      is_preview = false,
      access_level = 'enrolled',
      time_estimate_minutes = null,
      // Lesson Builder Foundation (Part 1, Step 2): name-only "+Add Lesson" creates the
      // linked builder `pages` row eagerly, right alongside the lesson row, so the new
      // flow never needs the builder route's lazy-backfill fallback. Existing callers
      // (LessonTypePicker's other lesson types, still using the old modal editor) don't
      // pass this and are unaffected.
      create_builder_page = false,
      // Part 3: an id into the server-side LESSON_TEMPLATES catalog, never raw client-
      // supplied tree JSON — the same "don't trust client input blindly" rule as every other
      // route in this codebase. An unrecognized/omitted id falls back to the blank canvas.
      template_id = null
    } = body;

    if (!module_id || !course_id || !title || !lesson_type) {
      return NextResponse.json({ error: 'Missing required fields: module_id, course_id, title, lesson_type' }, { status: 400 });
    }

    // Verify the target module actually belongs to the caller's own workspace before
    // attaching a lesson to it — module_id/course_id are never trusted blindly.
    const { data: moduleRow, error: moduleErr } = await adminClient
      .from('course_modules')
      .select('id')
      .eq('id', module_id)
      .eq('course_id', course_id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (moduleErr) throw moduleErr;
    if (!moduleRow) throw new ForbiddenError('You do not have access to this module');

    const { data: lesson, error } = await adminClient
      .from('course_lessons')
      .insert({
        module_id,
        course_id,
        workspace_id: workspaceId,
        title,
        lesson_type,
        content,
        position,
        is_preview,
        access_level,
        time_estimate_minutes
      })
      .select()
      .single();

    if (error) throw error;

    if (create_builder_page) {
      const template = template_id ? getLessonTemplateById(template_id) : null;
      // Real bug caught during Part 3 verification: passing a JSON *string* here stores it as
      // a jsonb string scalar, not a real object — the app's own readers tolerate this via a
      // defensive `typeof === 'string' ? JSON.parse() : ...` fallback, but direct SQL/
      // analytics access against `content` would see an opaque escaped string. Parsed here so
      // the column holds real, directly-queryable jsonb.
      const { error: pageErr } = await adminClient.from('pages').insert({
        workspace_id: workspaceId,
        course_lesson_id: lesson.id,
        name: title,
        content: JSON.parse(template?.content || BLANK_LESSON_CANVAS)
      });
      // Non-fatal: the lesson row itself is the primary result, and the Lesson Builder
      // route lazily creates a page on first open if this insert failed for any reason.
      if (pageErr) {
        logger.error({ err: pageErr, lessonId: lesson.id }, 'lms.lessons.post.builder_page_failed');
      }
    }

    // Best-effort: re-chunk/re-embed for RAG Q&A (Task 96). Never let an
    // embedding failure fail the lesson save itself — the save is the
    // primary operation; a failed embed just means this lesson isn't
    // searchable yet, and will retry on the next content-changing save.
    try {
      const ragResult = await processLessonForRAG(lesson.id);
      if (ragResult.status === 'failed') {
        logger.error({ lessonId: lesson.id, error: ragResult.error }, 'lms.lessons.post.rag_processing_failed');
      }
    } catch (ragErr) {
      logger.error({ err: ragErr, lessonId: lesson.id }, 'lms.lessons.post.rag_processing_threw');
    }

    // Best-effort: generate the AI lesson summary (Task 95). Same
    // never-fail-the-save rule as RAG processing above.
    try {
      const summaryResult = await processLessonSummary(lesson.id);
      if (summaryResult.status === 'failed') {
        logger.error({ lessonId: lesson.id, error: summaryResult.error }, 'lms.lessons.post.summary_processing_failed');
      }
    } catch (summaryErr) {
      logger.error({ err: summaryErr, lessonId: lesson.id }, 'lms.lessons.post.summary_processing_threw');
    }

    return NextResponse.json({ data: lesson });
  } catch (err: any) {
    logger.error({ err }, 'lms.lessons.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing lesson id parameter' }, { status: 400 });

    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const body = await req.json();
    const { title, lesson_type, content, position, is_preview, access_level, time_estimate_minutes, is_active, unlock_type, drip_value, module_id } = body;

    const updatePayload: any = {};
    if (title !== undefined) updatePayload.title = title;
    if (lesson_type !== undefined) updatePayload.lesson_type = lesson_type;
    if (content !== undefined) updatePayload.content = content;
    if (time_estimate_minutes !== undefined) updatePayload.time_estimate_minutes = time_estimate_minutes;
    if (position !== undefined) updatePayload.position = position;
    if (is_preview !== undefined) updatePayload.is_preview = is_preview;
    if (access_level !== undefined) updatePayload.access_level = access_level;
    if (is_active !== undefined) updatePayload.is_active = is_active;
    if (unlock_type !== undefined) updatePayload.unlock_type = unlock_type;
    if (drip_value !== undefined) updatePayload.drip_value = drip_value;
    // Cross-module move (Section C, Step 4 "Move") — module_id is trusted the same way every
    // other cross-entity reference is: verified below to belong to the caller's own workspace
    // AND the lesson's own course (moving a lesson between courses is not a supported case)
    // before it's accepted.
    if (module_id !== undefined) {
      const { data: existingLesson, error: lessonLookupErr } = await adminClient
        .from('course_lessons')
        .select('course_id')
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (lessonLookupErr) throw lessonLookupErr;
      if (!existingLesson) throw new NotFoundError('Lesson');

      const { data: targetModule, error: moduleLookupErr } = await adminClient
        .from('course_modules')
        .select('id')
        .eq('id', module_id)
        .eq('course_id', existingLesson.course_id)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (moduleLookupErr) throw moduleLookupErr;
      if (!targetModule) throw new ForbiddenError('Target module not found in this course');

      updatePayload.module_id = module_id;
    }
    updatePayload.updated_at = new Date().toISOString();

    const { data: lesson, error } = await adminClient
      .from('course_lessons')
      .update(updatePayload)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;

    // Same best-effort re-chunk/re-embed as POST, only worth doing when
    // content actually changed (title/position-only edits don't affect
    // what's embedded, and processLessonForRAG's own content_hash check
    // would no-op anyway, but skip the extra work/log noise here).
    if (content !== undefined) {
      try {
        const ragResult = await processLessonForRAG(lesson.id);
        if (ragResult.status === 'failed') {
          logger.error({ lessonId: lesson.id, error: ragResult.error }, 'lms.lessons.patch.rag_processing_failed');
        }
      } catch (ragErr) {
        logger.error({ err: ragErr, lessonId: lesson.id }, 'lms.lessons.patch.rag_processing_threw');
      }

      try {
        const summaryResult = await processLessonSummary(lesson.id);
        if (summaryResult.status === 'failed') {
          logger.error({ lessonId: lesson.id, error: summaryResult.error }, 'lms.lessons.patch.summary_processing_failed');
        }
      } catch (summaryErr) {
        logger.error({ err: summaryErr, lessonId: lesson.id }, 'lms.lessons.patch.summary_processing_threw');
      }
    }

    return NextResponse.json({ data: lesson });
  } catch (err: any) {
    logger.error({ err }, 'lms.lessons.patch.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing lesson id parameter' }, { status: 400 });

    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from('course_lessons')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'lms.lessons.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
