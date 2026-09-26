import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { ensureWatch, pubsubTopic, runImportJob, syncMailbox } from '@/lib/gmail/sync';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

// Gmail sync worker (Conversations batch 5), every minute. Three jobs, one time budget:
//   1. keep Pub/Sub watches alive (they expire after 7 days; renewed a day early);
//   2. incremental sync: mailboxes a push flagged, plus a safety-net poll so a lost push or an outage
//      never loses mail (every run when Pub/Sub isn't configured — then this IS the ongoing sync);
//   3. advance "Import existing conversations" jobs, a page at a time, resumably.
const BUDGET_MS = 45_000;
const SAFETY_NET_MINUTES = 10;

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const started = Date.now();
  const left = () => BUDGET_MS - (Date.now() - started);
  const admin = createAdminClient();
  const summary = { watches: 0, synced: 0, imports: 0, errors: 0 };

  try {
    // 1. Watches.
    if (pubsubTopic()) {
      const renewBefore = new Date(Date.now() + 86_400_000).toISOString();
      const { data: due } = await admin
        .from('email_mailboxes')
        .select('id')
        .eq('provider', 'gmail')
        .not('connection_id', 'is', null)
        .or(`watch_expires_at.is.null,watch_expires_at.lt.${renewBefore}`)
        .limit(20);
      for (const m of due || []) {
        if (left() < 30_000) break;
        try {
          await ensureWatch(m.id);
          summary.watches++;
        } catch (err) {
          summary.errors++;
          logger.warn({ err, mailboxId: m.id }, 'cron.gmail_sync.watch_failed');
        }
      }
    }

    // 2. Incremental sync.
    const pollBefore = new Date(Date.now() - (pubsubTopic() ? SAFETY_NET_MINUTES : 1) * 60_000).toISOString();
    const { data: toSync } = await admin
      .from('email_mailboxes')
      .select('id')
      .eq('provider', 'gmail')
      .not('connection_id', 'is', null)
      .or(`sync_requested_at.not.is.null,last_synced_at.is.null,last_synced_at.lt.${pollBefore}`)
      .order('sync_requested_at', { ascending: true, nullsFirst: false })
      .limit(25);
    for (const m of toSync || []) {
      if (left() < 15_000) break;
      const res = await syncMailbox(m.id, { budgetMs: Math.min(15_000, left() - 10_000) });
      if (res.status === 'error') summary.errors++;
      else if (res.status !== 'busy') summary.synced++;
    }

    // 3. Imports, oldest first, with whatever time is left.
    const { data: jobs } = await admin
      .from('email_import_jobs')
      .select('id')
      .in('status', ['counting', 'importing'])
      .order('created_at', { ascending: true })
      .limit(5);
    for (const j of jobs || []) {
      if (left() < 8_000) break;
      const res = await runImportJob(j.id, left() - 5_000);
      if (res.status !== 'busy') summary.imports++;
    }

    logger.info(summary, 'cron.gmail_sync.done');
    return NextResponse.json({ success: true, ...summary });
  } catch (err) {
    logger.error({ err }, 'cron.gmail_sync.failed');
    return NextResponse.json({ error: 'Gmail sync worker failed.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
