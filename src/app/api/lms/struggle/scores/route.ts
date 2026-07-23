import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { data: scores, error } = await adminClient
      .from('lms_student_struggle_scores')
      .select(`
        id,
        score,
        quiz_failure_rate_points,
        score_vector_points,
        passing_delta_points,
        time_multiplier_points,
        dropout_trends_points,
        reasons,
        updated_at,
        contact:contacts (
          id,
          first_name,
          last_name,
          email
        ),
        course:courses (
          id,
          title
        )
      `)
      .eq('workspace_id', workspaceId)
      .order('score', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data: scores });
  } catch (err: any) {
    logger.error({ err }, 'lms.struggle.scores.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
