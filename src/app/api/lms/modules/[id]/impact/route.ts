import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { getModuleDeleteImpact } from '@/lib/lms/moduleDeleteImpact';
import { NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// GET /api/lms/modules/{id}/impact — what deleting this module would remove (lessons, students, progress rows).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const impact = await getModuleDeleteImpact(createAdminClient(), { workspaceId, moduleId: id });
    if (!impact) throw new NotFoundError('Module');
    return NextResponse.json({ data: impact });
  } catch (err: any) {
    logger.error({ err }, 'lms.modules.impact.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
