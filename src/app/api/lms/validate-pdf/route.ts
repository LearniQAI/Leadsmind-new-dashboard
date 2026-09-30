import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { checkPdfLink } from '@/lib/lms/pdfLinkCheck';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Staff-side "is this pasted link a real, reachable PDF?" check for the Reading/Slides editor.
// Done here rather than in the browser because most PDF hosts don't send CORS headers. Always
// answers 200 with a `status` — a bad link is an expected result, not a server error.
export async function POST(req: NextRequest) {
  try {
    await requireWorkspaceAccess();
    const body = await req.json().catch(() => null);
    const url = typeof body?.url === 'string' ? body.url : '';
    if (!url.trim()) return NextResponse.json({ status: 'invalid_url', reason: 'Enter a link first' });
    return NextResponse.json(await checkPdfLink(url));
  } catch (err) {
    const client = toClientError(err);
    if (client.status >= 500) logger.error({ err }, 'lms.validate_pdf.failed');
    return NextResponse.json({ error: client.error }, { status: client.status });
  }
}
