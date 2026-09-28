import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { duplicateModule, ModuleNotFoundError } from '@/lib/lms/duplicateModule';
import { NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Real duplication (see lib/lms/duplicateModule.ts): new ids all the way down, always DRAFT,
// appended at the end of the course, no student progress copied, all-or-nothing.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();

    const { module, lessonsCopied, blocksCopied } = await duplicateModule(createAdminClient(), { workspaceId, moduleId: id });

    revalidatePath(`/courses/${module.course_id}`);
    return NextResponse.json({ data: module, lessonsCopied, blocksCopied });
  } catch (err: any) {
    logger.error({ err }, 'lms.modules.duplicate.failed');
    const clientError = toClientError(err instanceof ModuleNotFoundError ? new NotFoundError('Module') : err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
