import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'
import { UnauthorizedError, ForbiddenError, NotFoundError, toClientError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'
import { verifyDns } from '@/lib/domains/verify'

// Domain verification triggers a real DNS/Vercel API call and toggles domain trust state —
// restricted to admins/owners, same as API keys, integrations, and webhooks.
const ALLOWED_DOMAIN_VERIFY_ROLES = ['admin', 'owner'];

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) throw new UnauthorizedError();

    const { domainId } = await req.json()
    if (!domainId) {
      return NextResponse.json({ error: 'domainId is required' }, { status: 400 })
    }

    // Resolve the domain's real workspace_id server-side — a client-supplied workspaceId is
    // never trusted, and this route only ever received domainId, so ownership must be
    // resolved from the domain record itself before allowing the real Vercel API call.
    const adminClient = createAdminClient();
    const { data: domain, error: fetchError } = await adminClient
      .from('domain_configurations')
      .select('id, workspace_id')
      .eq('id', domainId)
      .maybeSingle()

    if (fetchError || !domain) {
      throw new NotFoundError('Domain configuration');
    }

    const supabaseUser = await createServerClient();
    const { data: membership } = await supabaseUser
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', domain.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      throw new ForbiddenError('You do not have access to this domain');
    }

    if (!ALLOWED_DOMAIN_VERIFY_ROLES.includes(membership.role)) {
      throw new ForbiddenError('Only workspace admins or owners can verify domains');
    }

    const result = await verifyDns(domainId)
    return NextResponse.json(result)
  } catch (err: any) {
    logger.error({ err }, 'domains.verify.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
