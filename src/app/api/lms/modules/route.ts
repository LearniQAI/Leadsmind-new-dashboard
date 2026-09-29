import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { ForbiddenError, NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { recomputeCoursePreviewLessons } from '@/lib/lms/coursePreview';
import { getModuleDeleteImpact } from '@/lib/lms/moduleDeleteImpact';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');
    const id = searchParams.get('id');

    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    if (id) {
      const { data: moduleRow, error } = await adminClient
        .from('course_modules')
        .select('*, lessons:course_lessons(*)')
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .single();

      if (error || !moduleRow) throw new NotFoundError('Module');
      return NextResponse.json({ data: moduleRow });
    }

    if (!courseId) {
      return NextResponse.json({ error: 'Missing courseId or id parameter' }, { status: 400 });
    }

    // lessons:course_lessons(*, builder_page:pages(id)) — real embedded lookup (real FK,
    // pages_course_lesson_id_fkey) so the client can tell whether a lesson has a linked
    // Lesson Builder canvas (new flow) vs. only legacy content_blocks (old modal flow),
    // without a second round trip per lesson.
    const { data: modules, error } = await adminClient
      .from('course_modules')
      .select('*, lessons:course_lessons(*, builder_page:pages(id))')
      .eq('course_id', courseId)
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: true })
      .order('position', { foreignTable: 'course_lessons', ascending: true });

    if (error) throw error;
    return NextResponse.json({ data: modules });
  } catch (err: any) {
    logger.error({ err }, 'lms.modules.get.failed');
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
      course_id,
      title,
      description = '',
      icon = '📚',
      nqf_level = '',
      required_for_completion = true,
      drip_days = 0,
      position = 0
    } = body;

    if (!course_id || !title) {
      return NextResponse.json({ error: 'Missing required fields: course_id, title' }, { status: 400 });
    }

    // Verify the target course actually belongs to the caller's own workspace before
    // attaching a module to it — course_id is never trusted blindly.
    const { data: courseRow, error: courseErr } = await adminClient
      .from('courses')
      .select('id')
      .eq('id', course_id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (courseErr) throw courseErr;
    if (!courseRow) throw new ForbiddenError('You do not have access to this course');

    const { data: moduleRow, error } = await adminClient
      .from('course_modules')
      .insert({
        course_id,
        workspace_id: workspaceId,
        title,
        description,
        icon,
        publish_status: 'draft', // always DRAFT — lifecycle changes only via PATCH /api/lms/courses/{courseId}/modules/{moduleId}
        nqf_level,
        required_for_completion,
        drip_days,
        position
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data: moduleRow });
  } catch (err: any) {
    logger.error({ err }, 'lms.modules.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing module id parameter' }, { status: 400 });

    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const body = await req.json();

    // This route edits module CONTENT settings only. Lifecycle (status / active) and order each have
    // exactly one validated path; accepting them here would re-open the cross-module hole those closed.
    const LIFECYCLE_FIELDS = ['publish_status', 'is_active', 'published_at', 'status'] as const;
    const ORDER_FIELDS = ['position', 'order_index'] as const;
    if (LIFECYCLE_FIELDS.some((f) => body?.[f] !== undefined)) {
      return NextResponse.json(
        { error: 'Module status cannot be changed here. Use PATCH /api/lms/courses/{courseId}/modules/{moduleId} with { status }.', code: 'USE_STATUS_ENDPOINT' },
        { status: 400 }
      );
    }
    if (ORDER_FIELDS.some((f) => body?.[f] !== undefined)) {
      return NextResponse.json(
        { error: 'Module order cannot be changed here. Use PATCH /api/lms/courses/{courseId}/modules/reorder.', code: 'USE_REORDER_ENDPOINT' },
        { status: 400 }
      );
    }

    const { title, description, icon, nqf_level, required_for_completion, drip_days } = body;

    const updatePayload: any = {};
    if (title !== undefined) updatePayload.title = title;
    if (description !== undefined) updatePayload.description = description;
    if (icon !== undefined) updatePayload.icon = icon;
    if (nqf_level !== undefined) updatePayload.nqf_level = nqf_level;
    if (required_for_completion !== undefined) updatePayload.required_for_completion = required_for_completion;
    if (drip_days !== undefined) updatePayload.drip_days = drip_days;
    updatePayload.updated_at = new Date().toISOString();

    const { data: moduleRow, error } = await adminClient
      .from('course_modules')
      .update(updatePayload)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data: moduleRow });
  } catch (err: any) {
    logger.error({ err }, 'lms.modules.patch.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing module id parameter' }, { status: 400 });

    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    // Fetched before the delete (which cascades to every lesson in this module and, through them, to
    // every student's progress on those lessons).
    const impact = await getModuleDeleteImpact(adminClient, { workspaceId, moduleId: id });
    if (!impact) throw new NotFoundError('Module');

    // Not a hard block: restructuring a course is legitimate. But destroying student progress needs an
    // explicit confirmation that the caller has seen the stakes (the UI fetches them from /impact).
    if (impact.progressRows > 0 && searchParams.get('confirmProgressLoss') !== 'true') {
      return NextResponse.json(
        { error: 'Deleting this module would remove student progress. Confirm to proceed.', code: 'PROGRESS_WOULD_BE_LOST', impact },
        { status: 409 }
      );
    }

    const { data: deleted, error } = await adminClient
      .from('course_modules')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('id');

    if (error) throw error;
    if (!deleted || deleted.length !== 1) throw new NotFoundError('Module');

    await recomputeCoursePreviewLessons(impact.courseId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'lms.modules.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
