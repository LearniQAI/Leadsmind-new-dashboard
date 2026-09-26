import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { IMPORT_RANGES, ownLiveMailbox, startImport, type ImportRange } from '@/lib/gmail/sync';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// "Import existing conversations" for the CALLER's own connected Gmail (never a teammate's).
// GET: latest job + progress. POST { range }: start. DELETE: cancel. The work itself happens in the
// gmail-sync cron worker, a page at a time.

const PUBLIC_FIELDS = 'id, status, since, total_messages, processed, imported, duplicates, skipped, errors, last_error, started_at, finished_at, created_at';

async function latestJob(mailboxId: string) {
  const { data } = await createAdminClient()
    .from('email_import_jobs')
    .select(PUBLIC_FIELDS)
    .eq('mailbox_id', mailboxId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

const fail = (err: unknown, tag: string) => {
  logger.error({ err }, tag);
  const e = toClientError(err);
  return NextResponse.json({ error: e.error, code: e.code }, { status: e.status });
};

export async function GET() {
  try {
    const { workspaceId, userId } = await requireWorkspaceAccess();
    const mailbox = await ownLiveMailbox(workspaceId, userId);
    if (!mailbox) return NextResponse.json({ mailbox: null, job: null });
    return NextResponse.json({ mailbox: { email: mailbox.email_address }, job: await latestJob(mailbox.id) });
  } catch (err) {
    return fail(err, 'gmail.import.status_failed');
  }
}

export async function POST(request: Request) {
  try {
    const { workspaceId, userId } = await requireWorkspaceAccess();
    const mailbox = await ownLiveMailbox(workspaceId, userId);
    if (!mailbox) return NextResponse.json({ error: 'Connect your Gmail first.' }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    const range = String(body?.range ?? '90') as ImportRange;
    if (!(range in IMPORT_RANGES)) return NextResponse.json({ error: 'Invalid range' }, { status: 400 });
    try {
      await startImport({ workspaceId, userId, mailboxId: mailbox.id, range });
    } catch (err: any) {
      if (/already running/.test(String(err?.message))) return NextResponse.json({ error: err.message }, { status: 409 });
      throw err;
    }
    return NextResponse.json({ job: await latestJob(mailbox.id) });
  } catch (err) {
    return fail(err, 'gmail.import.start_failed');
  }
}

export async function DELETE() {
  try {
    const { workspaceId, userId } = await requireWorkspaceAccess();
    const mailbox = await ownLiveMailbox(workspaceId, userId);
    if (!mailbox) return NextResponse.json({ error: 'No connected Gmail.' }, { status: 400 });
    await createAdminClient()
      .from('email_import_jobs')
      .update({ status: 'cancelled', finished_at: new Date().toISOString(), locked_until: null, updated_at: new Date().toISOString() })
      .eq('mailbox_id', mailbox.id)
      .in('status', ['counting', 'importing']);
    return NextResponse.json({ job: await latestJob(mailbox.id) });
  } catch (err) {
    return fail(err, 'gmail.import.cancel_failed');
  }
}
