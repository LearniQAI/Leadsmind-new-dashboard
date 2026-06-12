import { createClient } from '@supabase/supabase-js';
import { emitLMSEvent } from '../../../core/src/events/lms-event-bus';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Scans enrollments to detect students who have abandoned their learning journey.
 * Executes daily and triggers telemetry events matching specific inactivity thresholds.
 */
export async function scanForAbandonment() {
  console.log('[Abandonment Scanner] Running background database scan...');
  try {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // 1. Fetch all active enrollments
    const { data: enrollments, error: enrollErr } = await supabaseAdmin
      .from('enrollments')
      .select('*')
      .eq('active', true);

    if (enrollErr) throw enrollErr;
    if (!enrollments || enrollments.length === 0) {
      console.log('[Abandonment Scanner] No active enrollments found.');
      return { processed: 0 };
    }

    let triggeredCount = 0;

    for (const enrollment of enrollments) {
      const lastActive = new Date(enrollment.last_active_at || enrollment.enrolled_at || enrollment.created_at);
      
      // Enforce guardrail constraint: No more than 1 alert per 7-day operational cycle
      if (enrollment.last_abandonment_email_at) {
        const lastEmailSent = new Date(enrollment.last_abandonment_email_at);
        const diffMs = now.getTime() - lastEmailSent.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays < 7) {
          continue; // Skip: already received alert in last 7 days
        }
      }

      // 2. Fetch total lessons vs completed lessons
      const [lessonsRes, progressRes] = await Promise.all([
        supabaseAdmin.from('course_lessons').select('id, lesson_type').eq('course_id', enrollment.course_id),
        supabaseAdmin.from('course_progress').select('lesson_id').eq('contact_id', enrollment.contact_id).eq('course_id', enrollment.course_id)
      ]);

      const lessons = lessonsRes.data || [];
      const completedIds = (progressRes.data || []).map(p => p.lesson_id);
      
      if (lessons.length === 0 || completedIds.length === lessons.length) {
        continue; // Course is empty or already 100% completed
      }

      // Check for triggers based on inactivity duration
      let triggerEvent: string | null = null;

      if (lastActive < fourteenDaysAgo) {
        triggerEvent = 'course.abandoned.critical';
      } else if (lastActive < sevenDaysAgo) {
        triggerEvent = 'course.abandoned';
      } else if (lastActive < threeDaysAgo) {
        // Only trigger lesson.abandoned if there are unfinished video/audio steps
        const incompleteMedia = lessons.filter(l => 
          (l.lesson_type === 'video' || l.lesson_type === 'audio') && 
          !completedIds.includes(l.id)
        );
        if (incompleteMedia.length > 0) {
          triggerEvent = 'lesson.abandoned';
        }
      }

      if (triggerEvent) {
        console.log(`[Abandonment Scanner] Triggering event ${triggerEvent} for student ${enrollment.contact_id} in course ${enrollment.course_id}`);
        
        // Dispatch event to LMS event bus
        await emitLMSEvent(triggerEvent, {
          workspaceId: enrollment.workspace_id,
          contactId: enrollment.contact_id,
          courseId: enrollment.course_id
        });

        // Update last_abandonment_email_at to enforce rate-limiting guardrail
        await supabaseAdmin
          .from('enrollments')
          .update({ last_abandonment_email_at: now.toISOString() })
          .eq('id', enrollment.id);

        triggeredCount++;
      }
    }

    return { processed: enrollments.length, triggered: triggeredCount };
  } catch (err: any) {
    console.error('[Abandonment Scanner Error]:', err);
    throw err;
  }
}
