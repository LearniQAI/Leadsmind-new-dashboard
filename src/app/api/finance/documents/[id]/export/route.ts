import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { getDocumentSummaryData } from '@/lib/finance/documentSummary';
import { generateBookkeepingReportPDF } from '../../../../../../../libs/services/src/pdf/bookkeeping-report-generator';
import { generateBookkeepingReportExcel } from '@/lib/finance/bookkeepingExcelReport';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { workspaceId } = await requireWorkspaceRole();
    const format = req.nextUrl.searchParams.get('format') === 'xlsx' ? 'xlsx' : 'pdf';

    const data = await getDocumentSummaryData(workspaceId, params.id);

    if (format === 'xlsx') {
      const buffer = await generateBookkeepingReportExcel(data as any);
      return new NextResponse(buffer as any, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="bookkeeping-report-${params.id}.xlsx"`,
        },
      });
    }

    const buffer = await generateBookkeepingReportPDF(data as any);
    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="bookkeeping-report-${params.id}.pdf"`,
      },
    });
  } catch (err: any) {
    logger.error({ err, documentId: params.id }, 'finance.documents.export.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
