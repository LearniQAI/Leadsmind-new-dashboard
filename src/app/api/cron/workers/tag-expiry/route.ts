import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { publishEvent } from '@/lib/events/EventBus';
import { logger } from '@/shared/logger';
import { acquireCronWorkerLock, releaseCronWorkerLock } from '@/lib/cron/workerLock';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// tags.expires_at is a single expiry on the tag DEFINITION (Part 1 schema — not
// per-assignment), so when a tag expires, every one of its assignments lapses
// together. Removing the assignments here also fires the existing tag_assignments
// DELETE trigger (log_tag_assignment_history), which records the 'removed' tag_history
// row automatically — this worker's job is just to detect expiry and fan out the
// tag_expired automation event per previously-tagged contact.
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workerName = 'tag-expiry';
  try {
    if (!await acquireCronWorkerLock(workerName, 6 * 60 * 60)) {
      return NextResponse.json({ success: true, skipped: true, message: 'A prior sweep is still running' });
    }
  } catch (err) {
    logger.error({ err }, 'cron.tag_expiry.lock.failed');
    return NextResponse.json({ success: false, error: 'Could not acquire tag-expiry lock' }, { status: 500 });
  }

  const supabase = createAdminClient();
  let expiredTags = 0;
  let notifiedContacts = 0;

  try {
    const { data: expired, error } = await supabase
      .from('tags')
      .select('id, workspace_id, name')
      .lt('expires_at', new Date().toISOString());
    if (error) throw error;

    for (const tag of expired ?? []) {
      const { data: assignments } = await supabase
        .from('tag_assignments')
        .select('entity_id, entity_type')
        .eq('tag_id', tag.id);

      const { error: deleteErr } = await supabase.from('tag_assignments').delete().eq('tag_id', tag.id);
      if (deleteErr) {
        logger.error({ err: deleteErr, tagId: tag.id }, 'cron.tag_expiry.remove_assignments.failed');
        continue;
      }

      for (const assignment of assignments ?? []) {
        if (assignment.entity_type !== 'contact') continue;
        await publishEvent(tag.workspace_id, 'tag_expired', assignment.entity_id, { tagId: tag.id, tagName: tag.name });
        notifiedContacts++;
      }

      // Clear expires_at so this tag isn't picked up again on the next sweep —
      // the tag definition itself survives, only its (now-lapsed) assignments don't.
      await supabase.from('tags').update({ expires_at: null }).eq('id', tag.id);
      expiredTags++;
    }
  } catch (err) {
    logger.error({ err }, 'cron.tag_expiry.failed');
    return NextResponse.json({ success: false, error: 'Tag expiry sweep failed' }, { status: 500 });
  } finally {
    try { await releaseCronWorkerLock(workerName); } catch (err) { logger.error({ err }, 'cron.tag_expiry.lock_release.failed'); }
  }

  return NextResponse.json({ success: true, expiredTags, notifiedContacts });
}
