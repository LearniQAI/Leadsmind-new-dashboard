import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { evaluateStudentStruggle } from '../../../../../../libs/core/src/analytics/struggle-processor';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { contactId, courseId, workspaceId } = body;

    if (!contactId || !courseId || !workspaceId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const result = await evaluateStudentStruggle(contactId, courseId, workspaceId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, score: result.score });
  } catch (err: any) {
    console.error('[API Recalculate Struggle Score Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
