import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { deleteCalendarConnection } from '@/lib/calendar/connections';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Removes ONLY the caller's own provider='gmail' row. deleteCalendarConnection
// skips Google's revoke when the same Google account also backs the user's
// Calendar connection (revoke would drop that grant too).
export async function POST() {
  try {
    const { userId, workspaceId } = await requireWorkspaceAccess();
    await deleteCalendarConnection(workspaceId, userId, 'gmail');
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'gmail.disconnect.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
