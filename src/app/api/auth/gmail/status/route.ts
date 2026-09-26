import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { getGmailConnectionStatus } from '@/lib/gmail/connection';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// The CALLER's own Gmail connection in their current workspace. Any member —
// a mailbox is personal, unlike the admin-only workspace integrations list.
// Never returns tokens.
export async function GET() {
  try {
    const { userId, workspaceId } = await requireWorkspaceAccess();
    return NextResponse.json(await getGmailConnectionStatus(workspaceId, userId));
  } catch (err) {
    logger.error({ err }, 'gmail.status.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
