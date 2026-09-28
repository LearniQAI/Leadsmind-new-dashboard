import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { applyModuleStatus, deriveModuleStatus, ModuleStatusError } from '@/lib/lms/moduleStatus';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

const STATUS_HTTP = { NOT_FOUND: 404, INVALID_TRANSITION: 409, CONFLICT: 409, INVALID_STATUS: 400 } as const;

// PATCH /api/lms/courses/{courseId}/modules/{moduleId}  { "status": "PUBLISHED" | "INACTIVE" | "DRAFT" }
// Changes exactly one module: WHERE id AND course_id AND workspace_id, asserted to affect one row.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ courseId: string; moduleId: string }> }) {
  try {
    const { courseId, moduleId } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const body = await req.json().catch(() => ({}));

    const { module, from, to } = await applyModuleStatus(createAdminClient(), {
      workspaceId,
      courseId,
      moduleId,
      target: body?.status,
    });

    // Admin and student curriculum views read the same rows; drop any cached render of either.
    revalidatePath(`/courses/${courseId}`);
    revalidatePath(`/student/courses/${courseId}`);

    return NextResponse.json({ data: { ...module, status: deriveModuleStatus(module) }, from, to });
  } catch (err: any) {
    if (err instanceof ModuleStatusError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: STATUS_HTTP[err.code] });
    }
    logger.error({ err }, 'lms.module_status.patch.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
