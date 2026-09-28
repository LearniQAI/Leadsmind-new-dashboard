import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { recomputeCoursePreviewLessons } from '@/lib/lms/coursePreview';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// PATCH /api/lms/courses/{courseId}/modules/reorder
// Body: { "items": [ { "moduleId": "...", "order": 1 }, ... ] }
// Validation and the rewrite happen inside ONE Postgres function (reorder_course_modules), i.e. one
// transaction: it either rewrites every position or none. It changes course_modules.position only.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const { courseId } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const body = await req.json().catch(() => ({}));
    const items = body?.items;

    if (!Array.isArray(items) || items.length === 0 ||
        !items.every((i: any) => typeof i?.moduleId === 'string' && UUID.test(i.moduleId) && Number.isInteger(i?.order))) {
      return NextResponse.json({ error: 'items must be a non-empty list of { moduleId, order }', code: 'INVALID_ITEMS' }, { status: 400 });
    }

    const db = createAdminClient();
    const { error } = await db.rpc('reorder_course_modules', {
      p_course_id: courseId,
      p_workspace_id: workspaceId,
      p_items: items.map((i: any) => ({ moduleId: i.moduleId, order: i.order })),
    });

    if (error) {
      const msg = error.message || '';
      if (msg.includes('REORDER_FORBIDDEN')) return NextResponse.json({ error: 'One or more modules do not belong to this course', code: 'FORBIDDEN' }, { status: 403 });
      if (msg.includes('REORDER_NOT_FOUND')) return NextResponse.json({ error: 'Course not found', code: 'NOT_FOUND' }, { status: 404 });
      if (msg.includes('REORDER_INVALID')) return NextResponse.json({ error: msg.replace(/^.*REORDER_INVALID:\s*/, ''), code: 'INVALID_ITEMS' }, { status: 400 });
      throw error;
    }

    // Course Start Method 3 derives preview lessons from course-wide lesson order; a no-op elsewhere.
    await recomputeCoursePreviewLessons(courseId);
    // Admin and student curriculum must not diverge: drop any cached render of either.
    revalidatePath(`/courses/${courseId}`);
    revalidatePath(`/student/courses/${courseId}`);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'lms.modules.reorder.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
