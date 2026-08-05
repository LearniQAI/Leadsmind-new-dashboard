import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { publishEvent } from '@/lib/events/EventBus';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// 30-day lookahead matches the student portal's own "Access expires in N
// days" countdown badge (only shown when diffDays <= 30, see
// src/app/(portal)/portal/courses/page.tsx) — reusing that existing
// definition of "expiring soon" rather than inventing a second one.
const EXPIRING_LOOKAHEAD_DAYS = 30;

// Same shape as tag-expiry/route.ts: scan for a time-based condition, fan out
// a publishEvent per affected contact. Dedupe here is expiring_notified_at
// (see 20260805000000_enrollment_expiring_notified.sql) rather than clearing
// expires_at the way tag-expiry clears tags.expires_at — expires_at is real
// access-expiry data still needed elsewhere (the portal countdown badge, and
// any future revoke-on-expiry job), so it must survive this sweep untouched.
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  let notifiedEnrollments = 0;

  try {
    const now = new Date();
    const lookaheadCutoff = new Date(now.getTime() + EXPIRING_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);

    const { data: expiringSoon, error } = await supabase
      .from('enrollments')
      .select('id, contact_id, expires_at, courses(workspace_id)')
      .not('expires_at', 'is', null)
      .is('expiring_notified_at', null)
      .gt('expires_at', now.toISOString())
      .lte('expires_at', lookaheadCutoff.toISOString());
    if (error) throw error;

    for (const enrollment of expiringSoon ?? []) {
      const workspaceId = (enrollment as any).courses?.workspace_id;
      if (!workspaceId || !enrollment.contact_id) continue;

      await publishEvent(workspaceId, 'course_expiring', enrollment.contact_id, {
        enrollmentId: enrollment.id,
        expiresAt: enrollment.expires_at,
      });

      // Mark notified so this same enrollment isn't re-published on the next
      // sweep — expires_at itself is left alone (see module comment above).
      await supabase.from('enrollments').update({ expiring_notified_at: now.toISOString() }).eq('id', enrollment.id);
      notifiedEnrollments++;
    }
  } catch (err) {
    logger.error({ err }, 'cron.course_expiry.failed');
    return NextResponse.json({ success: false, error: 'Course expiry sweep failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true, results: { notifiedEnrollments } });
}
