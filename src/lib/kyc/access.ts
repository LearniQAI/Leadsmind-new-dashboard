import { getUser } from '@/lib/auth';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';
import { UnauthorizedError, ForbiddenError, NotFoundError, AppError } from '@/shared/errors/AppError';

export interface ContactAccessResult {
  userId: string;
  contact: Record<string, any>;
}

// Confirms the caller is authenticated and authorized against a specific contact record via
// EITHER of two independent access models used across this codebase:
//   (a) an internal team member of the contact's real workspace (workspace_members), or
//   (b) the portal-authenticated contact themself — the same predicate getPortalSession()
//       (src/lib/portal/session.ts) already uses: authenticated user's email matches the
//       contact's email, and portal access is enabled and not revoked.
// The contact's real workspace_id is always resolved from the DB record itself — a
// client-supplied workspaceId is never trusted for authorization.
export async function assertContactAccessOrPortalSelf(contactId: string): Promise<ContactAccessResult> {
  const user = await getUser();
  if (!user) throw new UnauthorizedError();

  const adminClient = createAdminClient();
  const { data: contact, error } = await adminClient
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  if (error || !contact) {
    throw new NotFoundError('Contact');
  }

  // Branch (a): internal team member of the contact's real workspace
  const supabaseUser = await createServerClient();
  const { data: membership } = await supabaseUser
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', contact.workspace_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (membership) {
    return { userId: user.id, contact };
  }

  // Branch (b): the portal-authenticated contact themself, scoped to exactly this contact
  // record — NOT to their whole workspace.
  const isPortalSelf =
    !!contact.email &&
    !!user.email &&
    contact.email.toLowerCase() === user.email.toLowerCase() &&
    contact.portal_access_enabled === true &&
    contact.portal_access_revoked !== true;

  if (isPortalSelf) {
    return { userId: user.id, contact };
  }

  throw new ForbiddenError('You do not have access to this contact');
}

// Same 24-hour cooldown window used by the original crm/contacts/kyc bureau-check fix
// (RECHECK_COOLDOWN_MS), reused here for consistency rather than inventing a different
// threshold for this sibling endpoint. Applied per (contact_id, check_type) pair.
export const RECHECK_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function assertBureauCheckCooldown(
  adminClient: ReturnType<typeof createAdminClient>,
  contactId: string,
  checkType: string,
  forceRecheck: boolean
): Promise<void> {
  if (forceRecheck) return;

  const { data: recentCheck } = await adminClient
    .from('kyc_checks')
    .select('id, checked_at, created_at')
    .eq('contact_id', contactId)
    .eq('check_type', checkType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentCheck) {
    const lastCheckedAt = new Date(recentCheck.checked_at || recentCheck.created_at).getTime();
    if (Date.now() - lastCheckedAt < RECHECK_COOLDOWN_MS) {
      throw new AppError(
        'RECHECK_COOLDOWN',
        `This contact was already checked for '${checkType}' within the last 24 hours. Pass forceRecheck: true to run it again.`,
        429
      );
    }
  }
}
