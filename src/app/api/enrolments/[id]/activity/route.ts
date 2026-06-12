import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const enrolmentId = params.id;
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { lessonId, progressSeconds } = body;

    const adminClient = createAdminClient();

    // 1. Update last_active_at on the enrollment row
    const { data: enrollment, error: enrollErr } = await adminClient
      .from('enrollments')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', enrolmentId)
      .select('contact_id, course_id, workspace_id')
      .single();

    if (enrollErr || !enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // 2. If lessonId and progressSeconds are provided, log watch tracking position
    if (lessonId && typeof progressSeconds === 'number') {
      const { data: existing } = await adminClient
        .from('course_progress')
        .select('id, completed_at')
        .eq('contact_id', enrollment.contact_id)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (existing) {
        const updates: any = { progress_seconds: progressSeconds };
        if (!existing.completed_at) {
          updates.completed_at = null;
        }
        const { error: updateErr } = await adminClient
          .from('course_progress')
          .update(updates)
          .eq('id', existing.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await adminClient
          .from('course_progress')
          .insert({
            workspace_id: enrollment.workspace_id,
            contact_id: enrollment.contact_id,
            course_id: enrollment.course_id,
            lesson_id: lessonId,
            progress_seconds: progressSeconds,
            completed_at: null
          });
        if (insertErr) throw insertErr;
      }

      // Trigger struggle evaluation in the background
      try {
        const { evaluateStudentStruggle } = await import('../../../../../../libs/core/src/analytics/struggle-processor');
        await evaluateStudentStruggle(enrollment.contact_id, enrollment.course_id, enrollment.workspace_id);
      } catch (err) {
        console.error('[Heartbeat Struggle Evaluation Error]:', err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Heartbeat Sync API Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
