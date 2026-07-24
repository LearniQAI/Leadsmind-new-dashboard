import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { ForbiddenError, NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

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
      access_level = 'enrolled'
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
        access_level
      })
      .select()
      .single();

    if (error) throw error;
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
    const { title, lesson_type, content, position, is_preview, access_level } = body;

    const updatePayload: any = {};
    if (title !== undefined) updatePayload.title = title;
    if (lesson_type !== undefined) updatePayload.lesson_type = lesson_type;
    if (content !== undefined) updatePayload.content = content;
    if (position !== undefined) updatePayload.position = position;
    if (is_preview !== undefined) updatePayload.is_preview = is_preview;
    if (access_level !== undefined) updatePayload.access_level = access_level;
    updatePayload.updated_at = new Date().toISOString();

    const { data: lesson, error } = await adminClient
      .from('course_lessons')
      .update(updatePayload)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;
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
