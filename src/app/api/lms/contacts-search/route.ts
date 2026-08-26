import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Session-authenticated contact search for the "Add student" quick-action (Section C).
// /api/v1/contacts is API-key-gated and not usable from an admin dashboard session, so this
// is a minimal workspace-scoped search reusing the same requireLmsInstructor gate as every
// other lms admin route.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();

    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    let query = adminClient
      .from('contacts')
      .select('id, first_name, last_name, email')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (q) {
      query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    logger.error({ err }, 'lms.contacts-search.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
