import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Real whole-course delete (Systeme-parity Master Prompt, Section 1 Bug 1). Audited first:
// no delete-course action/route existed anywhere in the codebase before this (confirmed via
// codebase-wide search). Cascade confirmed live via a real information_schema query against
// the linked project, not assumed: courses -> course_modules -> course_lessons ->
// content_blocks -> lesson_block_completions are all ON DELETE CASCADE, and
// enrollments.course_id is ON DELETE CASCADE too — a single DELETE FROM courses is enough;
// no manual cascade needed here. course_lessons.course_id itself has no FK to courses (a
// pre-existing gap noted in getCourses()), but lessons still cascade for real via
// module_id -> course_modules -> courses, so nothing is orphaned.
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing course id parameter' }, { status: 400 });

    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    // Workspace-scoped the same way every other destructive lms route in this codebase is —
    // a user cannot delete another workspace's course by id-guessing.
    const { data: courseRow, error: lookupErr } = await adminClient
      .from('courses')
      .select('id')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (lookupErr) throw lookupErr;
    if (!courseRow) throw new NotFoundError('Course');

    const { error } = await adminClient
      .from('courses')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'lms.courses.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
