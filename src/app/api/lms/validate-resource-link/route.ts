import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { checkResourceLink } from '@/lib/lms/resourceLinkCheck';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Staff-side "is this pasted link real and reachable?" check for the Downloadable resource
// field (any file type — see validate-pdf for the PDF-specific Reading/Slides equivalent).
// Always answers 200 with a `status` — a bad or unshared link is an expected result, not a
// server error.
export async function POST(req: NextRequest) {
  try {
    await requireWorkspaceAccess();
    const body = await req.json().catch(() => null);
    const url = typeof body?.url === 'string' ? body.url : '';
    if (!url.trim()) return NextResponse.json({ status: 'invalid_url', reason: 'Enter a link first' });
    return NextResponse.json(await checkResourceLink(url));
  } catch (err) {
    const client = toClientError(err);
    if (client.status >= 500) logger.error({ err }, 'lms.validate_resource_link.failed');
    return NextResponse.json({ error: client.error }, { status: client.status });
  }
}
