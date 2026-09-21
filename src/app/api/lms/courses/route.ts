import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Course removal. A course that has EVER had an enrolment or issued a certificate is ARCHIVED
// (status 'archived', published false, archived_at set), never destroyed: courses ->
// enrollments / course_progress / course_certificates are all ON DELETE CASCADE, so a hard delete
// wiped paid students' history and killed public certificate-verification links (Batch 2 / fix 6).
// A course with zero enrolments AND zero certificates can still be fully deleted (cascade then
// removes its modules -> lessons -> content_blocks; nothing of value is lost).
//
// Existing students of an archived course keep their access and certificates — archiving hides the
// course from catalogues and blocks NEW enrolments (enrollStudent / checkout require published).
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing course id parameter' }, { status: 400 });

    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    // Workspace-scoped the same way every other destructive lms route in this codebase is —
    // a user cannot remove another workspace's course by id-guessing.
    const { data: courseRow, error: lookupErr } = await adminClient
      .from('courses')
      .select('id, status')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (lookupErr) throw lookupErr;
    if (!courseRow) throw new NotFoundError('Course');

    const [{ count: enrolmentCount, error: enrErr }, { count: certCount, error: certErr }] = await Promise.all([
      adminClient.from('enrollments').select('id', { count: 'exact', head: true }).eq('course_id', id),
      adminClient.from('course_certificates').select('id', { count: 'exact', head: true }).eq('course_id', id),
    ]);
    if (enrErr) throw enrErr;
    if (certErr) throw certErr;

    if ((enrolmentCount ?? 0) > 0 || (certCount ?? 0) > 0) {
      const { error } = await adminClient
        .from('courses')
        .update({ status: 'archived', published: false, archived_at: new Date().toISOString() })
        .eq('id', id)
        .eq('workspace_id', workspaceId);
      if (error) throw error;

      return NextResponse.json({
        success: true,
        archived: true,
        message: `This course has ${enrolmentCount ?? 0} enrolment(s) and ${certCount ?? 0} issued certificate(s), so it was archived instead of deleted. Students keep their access and certificates.`,
      });
    }

    const { error } = await adminClient
      .from('courses')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw error;

    return NextResponse.json({ success: true, deleted: true });
  } catch (err: any) {
    logger.error({ err }, 'lms.courses.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

// Restore an archived course to draft (it must be re-published deliberately).
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing course id parameter' }, { status: 400 });

    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from('courses')
      .update({ status: 'draft', published: false, archived_at: null })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .eq('status', 'archived')
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundError('Archived course');
    return NextResponse.json({ success: true, restored: true });
  } catch (err: any) {
    logger.error({ err }, 'lms.courses.restore.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
