import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { requireLmsInstructor } from '@/lib/lms/access';
import { NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// GET /api/courses/[id]/modules - retrieve modules for a specific course
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const courseId = params.id;
    // Real session + verified workspace_members row — the previous version only read the
    // active_workspace_id cookie with no proof the caller was even authenticated.
    const { workspaceId } = await requireWorkspaceAccess();

    const supabase = await createServerClient();

    // Verify course belongs to active workspace
    const { data: course, error: courseErr } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .eq('workspace_id', workspaceId)
      .single();

    if (courseErr || !course) throw new NotFoundError('Course');

    // Retrieve modules with nested lessons
    const { data: modules, error: modulesErr } = await supabase
      .from('modules')
      .select('*, lessons:lessons(id, title, order_index, is_free:is_preview, video_url, content, type, metadata)')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (modulesErr) throw modulesErr;

    return NextResponse.json({ success: true, data: modules });
  } catch (err: any) {
    logger.error({ err }, 'courses.modules.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

// POST /api/courses/[id]/modules - create a new module under course (instructor-only)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const courseId = params.id;
    const { workspaceId } = await requireLmsInstructor();

    const body = await req.json();
    const { name, description = '', icon_emoji = null, publish_status = 'Draft', nqf_level = '', is_required_for_completion = false } = body;

    // Strict validation: Reject payloads missing mandatory fields (name)
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Missing mandatory field: name' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Verify course ownership
    const { data: course, error: courseErr } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .eq('workspace_id', workspaceId)
      .single();

    if (courseErr || !course) throw new NotFoundError('Course');

    // Determine next order_index
    const { count } = await supabase
      .from('modules')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', courseId);

    const nextOrderIndex = (count || 0) + 1;

    // Create the module
    const { data: newModule, error: insertErr } = await supabase
      .from('modules')
      .insert({
        course_id: courseId,
        name,
        description,
        icon_emoji,
        publish_status,
        nqf_level,
        is_required_for_completion,
        order_index: nextOrderIndex
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json({ success: true, data: newModule }, { status: 201 });
  } catch (err: any) {
    logger.error({ err }, 'courses.modules.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
