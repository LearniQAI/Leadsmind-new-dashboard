import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { getDocumentSummaryData } from '@/lib/finance/documentSummary';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { workspaceId } = await requireWorkspaceRole();
    const data = await getDocumentSummaryData(workspaceId, params.id);
    return NextResponse.json(data);
  } catch (err: any) {
    logger.error({ err, documentId: params.id }, 'finance.documents.summary.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
