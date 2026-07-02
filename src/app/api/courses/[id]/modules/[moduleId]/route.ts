import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/courses/[id]/modules/[moduleId] - retrieve a single module details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; moduleId: string } }
) {
  try {
    const { id: courseId, moduleId } = params;
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace active' }, { status: 401 });
    }

    const supabase = await createServerClient();

    // Verify module ownership via course -> workspace
    const { data: moduleObj, error: moduleErr } = await supabase
      .from('modules')
      .select('*, courses!inner(workspace_id)')
      .eq('id', moduleId)
      .eq('course_id', courseId)
      .single();

    if (moduleErr || !moduleObj) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    const courseWorkspaceId = (moduleObj.courses as any)?.workspace_id;
    if (courseWorkspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    // Clean reference so we don't return the course details if not needed
    const { courses, ...moduleData } = moduleObj;

    return NextResponse.json({ success: true, data: moduleData });
  } catch (err: any) {
    console.error('[MODULE DETAIL GET ERROR]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/courses/[id]/modules/[moduleId] - update module attributes
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; moduleId: string } }
) {
  try {
    const { id: courseId, moduleId } = params;
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace active' }, { status: 401 });
    }

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

    if (moduleErr || !moduleObj) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    const courseWorkspaceId = (moduleObj.courses as any)?.workspace_id;
    if (courseWorkspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    // Build update object
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (icon_emoji !== undefined) updateData.icon_emoji = icon_emoji;
    if (publish_status !== undefined) updateData.publish_status = publish_status;
    if (nqf_level !== undefined) updateData.nqf_level = nqf_level;
    if (is_required_for_completion !== undefined) updateData.is_required_for_completion = is_required_for_completion;

    const { data: updatedModule, error: updateErr } = await supabase
      .from('modules')
      .update(updateData)
      .eq("id", moduleId).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, data: updatedModule });
  } catch (err: any) {
    console.error('[MODULE DETAIL PUT ERROR]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/courses/[id]/modules/[moduleId] - remove a module
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; moduleId: string } }
) {
  try {
    const { id: courseId, moduleId } = params;
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace active' }, { status: 401 });
    }

    const supabase = await createServerClient();

    // Verify ownership
    const { data: moduleObj, error: moduleErr } = await supabase
      .from('modules')
      .select('id, course_id, courses!inner(workspace_id)')
      .eq('id', moduleId)
      .eq('course_id', courseId)
      .single();

    if (moduleErr || !moduleObj) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    const courseWorkspaceId = (moduleObj.courses as any)?.workspace_id;
    if (courseWorkspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    const { error: deleteErr } = await supabase
      .from('modules')
      .delete()
      .eq("id", moduleId).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({ success: true, message: 'Module deleted successfully' });
  } catch (err: any) {
    console.error('[MODULE DETAIL DELETE ERROR]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
