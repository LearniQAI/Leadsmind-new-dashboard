import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { deleteCalendarConnection } from '@/lib/calendar/connections';
import { createAdminClient } from '@/lib/supabase/server';
import { loadMailboxContext, ownLiveMailbox, stopWatch } from '@/lib/gmail/sync';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Removes ONLY the caller's own provider='gmail' row. deleteCalendarConnection
// skips Google's revoke when the same Google account also backs the user's
// Calendar connection (revoke would drop that grant too).
export async function POST() {
  try {
    const { userId, workspaceId } = await requireWorkspaceAccess();
    // Stop Gmail push notifications while we still hold a token (best-effort: a revoked token just
    // means Google has already stopped them). The mailbox row stays for provenance; its
    // connection_id is nulled by the FK, which also takes it out of the sync worker.
    const mailbox = await ownLiveMailbox(workspaceId, userId);
    if (mailbox) {
      try {
        const ctx = await loadMailboxContext(mailbox.id);
        await stopWatch(ctx.token);
      } catch (err) {
        logger.warn({ err }, 'gmail.disconnect.stop_watch_skipped');
      }
      await createAdminClient().from('email_mailboxes').update({ watch_expires_at: null }).eq('id', mailbox.id);
    }
    await deleteCalendarConnection(workspaceId, userId, 'gmail');
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'gmail.disconnect.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
