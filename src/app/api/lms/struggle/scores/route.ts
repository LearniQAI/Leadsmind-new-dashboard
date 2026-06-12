import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 });
    }

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
    console.error('[API Struggle Scores Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
