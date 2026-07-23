import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { requireLmsInstructor } from '@/lib/lms/access';
import { ForbiddenError, NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// GET /api/courses/[id]/modules/[moduleId] - retrieve a single module details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; moduleId: string } }
) {
  try {
    const { id: courseId, moduleId } = params;
    // Real session + verified workspace_members row — the previous version only read the
    // active_workspace_id cookie with no proof the caller was even authenticated.
    const { workspaceId } = await requireWorkspaceAccess();

    const supabase = await createServerClient();

    // Verify module ownership via course -> workspace
    const { data: moduleObj, error: moduleErr } = await supabase
      .from('modules')
      .select('*, courses!inner(workspace_id)')
      .eq('id', moduleId)
      .eq('course_id', courseId)
      .single();

    if (moduleErr || !moduleObj) throw new NotFoundError('Module');

    const courseWorkspaceId = (moduleObj.courses as any)?.workspace_id;
    if (courseWorkspaceId !== workspaceId) throw new ForbiddenError('Unauthorized workspace access');

    // Clean reference so we don't return the course details if not needed
    const { courses, ...moduleData } = moduleObj;

    return NextResponse.json({ success: true, data: moduleData });
  } catch (err: any) {
    logger.error({ err }, 'courses.module_detail.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

// PUT /api/courses/[id]/modules/[moduleId] - update module attributes (instructor-only)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; moduleId: string } }
) {
  try {
    const { id: courseId, moduleId } = params;
    const { workspaceId } = await requireLmsInstructor();

    const body = await req.json();
    const { name, description, icon_emoji, publish_status, nqf_level, is_required_for_completion } = body;

    // Strict validation: Reject if name is empty
    if (name !== undefined && (!name || typeof name !== 'string' || name.trim() === '')) {
      return NextResponse.json({ error: 'Validation failed: name cannot be empty' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Verify ownership
    const { data: moduleObj, error: moduleErr } = await supabase
      .from('modules')
      .select('id, course_id, courses!inner(workspace_id)')
      .eq('id', moduleId)
      .eq('course_id', courseId)
      .single();

    if (moduleErr || !moduleObj) throw new NotFoundError('Module');

    const courseWorkspaceId = (moduleObj.courses as any)?.workspace_id;
    if (courseWorkspaceId !== workspaceId) throw new ForbiddenError('Unauthorized workspace access');

    // Build update object
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (icon_emoji !== undefined) updateData.icon_emoji = icon_emoji;
    if (publish_status !== undefined) updateData.publish_status = publish_status;
    if (nqf_level !== undefined) updateData.nqf_level = nqf_level;
    if (is_required_for_completion !== undefined) updateData.is_required_for_completion = is_required_for_completion;

    // NOTE: `modules` has no workspace_id column of its own — ownership was already
    // verified above via the courses!inner(workspace_id) join, so the update is scoped by
    // id (+ course_id implicitly, since it was verified against courseId above).
    const { data: updatedModule, error: updateErr } = await supabase
      .from('modules')
      .update(updateData)
      .eq('id', moduleId)
      .eq('course_id', courseId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, data: updatedModule });
  } catch (err: any) {
    logger.error({ err }, 'courses.module_detail.put.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

// DELETE /api/courses/[id]/modules/[moduleId] - remove a module (instructor-only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; moduleId: string } }
) {
  try {
    const { id: courseId, moduleId } = params;
    const { workspaceId } = await requireLmsInstructor();

    const supabase = await createServerClient();

    // Verify ownership
    const { data: moduleObj, error: moduleErr } = await supabase
      .from('modules')
      .select('id, course_id, courses!inner(workspace_id)')
      .eq('id', moduleId)
      .eq('course_id', courseId)
      .single();

    if (moduleErr || !moduleObj) throw new NotFoundError('Module');

    const courseWorkspaceId = (moduleObj.courses as any)?.workspace_id;
    if (courseWorkspaceId !== workspaceId) throw new ForbiddenError('Unauthorized workspace access');

    const { error: deleteErr } = await supabase
      .from('modules')
      .delete()
      .eq('id', moduleId)
      .eq('course_id', courseId);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({ success: true, message: 'Module deleted successfully' });
  } catch (err: any) {
    logger.error({ err }, 'courses.module_detail.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
