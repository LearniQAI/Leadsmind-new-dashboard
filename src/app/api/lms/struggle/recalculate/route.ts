import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { ForbiddenError, toClientError } from '@/shared/errors/AppError';
import { evaluateStudentStruggle } from '../../../../../../libs/core/src/analytics/struggle-processor';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const body = await req.json();
    const { contactId, courseId } = body;
    // workspaceId is intentionally taken from the session, never the client body.

    if (!contactId || !courseId) {
      return NextResponse.json({ error: 'Missing parameters: contactId, courseId' }, { status: 400 });
    }

    // Confirm the contact and course actually belong to the caller's own workspace before
    // recalculating (and thus reading) their struggle profile.
    const [{ data: contact }, { data: course }] = await Promise.all([
      adminClient.from('contacts').select('id').eq('id', contactId).eq('workspace_id', workspaceId).maybeSingle(),
      adminClient.from('courses').select('id').eq('id', courseId).eq('workspace_id', workspaceId).maybeSingle(),
    ]);

    if (!contact || !course) {
      throw new ForbiddenError('You do not have access to this contact or course');
    }

    const result = await evaluateStudentStruggle(contactId, courseId, workspaceId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, score: result.score });
  } catch (err: any) {
    logger.error({ err }, 'lms.struggle.recalculate.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
