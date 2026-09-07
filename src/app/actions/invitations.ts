'use server';

// Real accept-invite flow for the self-service team invite (workspace_invitations).
// The invitation row's own `id` (a server-generated gen_random_uuid(), cryptographically
// random) doubles as the accept-invite token — no separate token column needed. Every
// membership write here goes through the admin client (service role, bypasses RLS),
// the same pattern src/app/actions/settings.ts's directCreate path already uses, rather
// than depending on the session client's own workspace_members RLS policies.

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';

export interface InvitationDetails {
  id: string;
  workspaceId: string;
  workspaceName: string;
  email: string;
  role: string;
  permissions: string[];
}

export type InvitationLookupResult =
  | { status: 'valid'; invitation: InvitationDetails }
  | { status: 'invalid' }
  | { status: 'expired' }
  | { status: 'accepted' };

export async function getInvitationByToken(token: string): Promise<InvitationLookupResult> {
  if (!token) return { status: 'invalid' };

  try {
    const adminClient = createAdminClient();
    const { data: invite, error } = await adminClient
      .from('workspace_invitations')
      .select('id, workspace_id, email, role, permissions, status, expires_at, workspaces(name)')
      .eq('id', token)
      .maybeSingle();

    if (error || !invite) return { status: 'invalid' };
    if (invite.status === 'accepted') return { status: 'accepted' };

    const isExpired = invite.status === 'expired' || new Date(invite.expires_at) < new Date();
    if (isExpired) {
      if (invite.status !== 'expired') {
        await adminClient.from('workspace_invitations').update({ status: 'expired' }).eq('id', invite.id);
      }
      return { status: 'expired' };
    }

    const workspace = invite.workspaces as unknown as { name: string } | null;

    return {
      status: 'valid',
      invitation: {
        id: invite.id,
        workspaceId: invite.workspace_id,
        workspaceName: workspace?.name || 'this workspace',
        email: invite.email,
        role: invite.role,
        permissions: Array.isArray(invite.permissions) ? invite.permissions : [],
      },
    };
  } catch (err) {
    logger.error({ err, token }, 'invitations.get_by_token.failed');
    return { status: 'invalid' };
  }
}

// Whether a real `users` row already exists for this email — decides whether the
// accept-invite page offers "create your account" or "sign in to accept".
export async function checkAccountExists(email: string): Promise<boolean> {
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient.from('users').select('id').ilike('email', email).maybeSingle();
    return !!data;
  } catch (err) {
    logger.error({ err, email }, 'invitations.check_account_exists.failed');
    return false;
  }
}

// Brand-new account (no prior LeadsMind login), invited by email — creates a real,
// already-confirmed auth user (mirrors settings.ts inviteTeamMember's directCreate
// path) and grants membership for the SPECIFIC invited workspace/role/permissions.
// Deliberately does not touch setup_workspace/ensureWorkspace's "create them a lone
// new workspace" path at all.
export async function acceptInviteNewAccount(token: string, password: string, fullName: string) {
  try {
    const lookup = await getInvitationByToken(token);
    if (lookup.status !== 'valid') return { error: lookup.status };

    const { invitation } = lookup;

    if (await checkAccountExists(invitation.email)) {
      return { error: 'account_exists' as const };
    }

    const adminClient = createAdminClient();

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (authError || !authData.user) {
      logger.error({ err: authError, email: invitation.email }, 'invitations.accept_new.auth_create.failed');
      return { error: 'create_failed' as const };
    }

    const nameParts = fullName.trim().split(/\s+/);
    const { error: profileError } = await adminClient.from('users').upsert(
      {
        id: authData.user.id,
        email: invitation.email,
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' '),
      },
      { onConflict: 'id' }
    );
    if (profileError) {
      logger.error({ err: profileError, userId: authData.user.id }, 'invitations.accept_new.profile_upsert.failed');
    }

    const { error: memberError } = await adminClient.from('workspace_members').insert({
      workspace_id: invitation.workspaceId,
      user_id: authData.user.id,
      role: invitation.role,
      permissions: invitation.permissions,
    });

    if (memberError) {
      logger.error({ err: memberError, invitationId: invitation.id }, 'invitations.accept_new.member_insert.failed');
      return { error: 'member_insert_failed' as const };
    }

    await adminClient.from('workspace_invitations').update({ status: 'accepted' }).eq('id', invitation.id);

    return { success: true as const, workspaceId: invitation.workspaceId, email: invitation.email };
  } catch (err) {
    logger.error({ err, token }, 'invitations.accept_new.failed');
    return { error: 'unexpected' as const };
  }
}

// Caller already has a real, authenticated session (an existing account that just
// signed in, or a freshly-created OAuth session) — adds ONLY the workspace_members
// row for the specific invited workspace/role. Never creates an account, never
// touches the caller's existing membership(s) elsewhere. Idempotent: safe to call
// again for a token this exact user has already redeemed (e.g. ensureWorkspace()
// already accepted it for them via a brand-new OAuth signup).
export async function acceptInviteExistingUser(token: string) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !user.email) return { error: 'not_authenticated' as const };

    const adminClient = createAdminClient();

    const { data: invite } = await adminClient
      .from('workspace_invitations')
      .select('id, workspace_id, email, role, permissions, status, expires_at')
      .eq('id', token)
      .maybeSingle();

    if (!invite) return { error: 'invalid' as const };
    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      return { error: 'email_mismatch' as const };
    }

    if (invite.status === 'accepted') {
      // Already redeemed — succeed as a no-op only if THIS user is the one who
      // holds the resulting membership (covers ensureWorkspace() already
      // accepting it during a brand-new OAuth signup).
      const { data: membership } = await adminClient
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', invite.workspace_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (membership) return { success: true as const, workspaceId: invite.workspace_id, alreadyMember: true };
      return { error: 'accepted' as const };
    }

    const isExpired = invite.status === 'expired' || new Date(invite.expires_at) < new Date();
    if (isExpired) {
      if (invite.status !== 'expired') {
        await adminClient.from('workspace_invitations').update({ status: 'expired' }).eq('id', invite.id);
      }
      return { error: 'expired' as const };
    }

    const { data: existingMembership } = await adminClient
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', invite.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existingMembership) {
      const { error: memberError } = await adminClient.from('workspace_members').insert({
        workspace_id: invite.workspace_id,
        user_id: user.id,
        role: invite.role,
        permissions: Array.isArray(invite.permissions) ? invite.permissions : [],
      });
      if (memberError) {
        logger.error({ err: memberError, invitationId: invite.id }, 'invitations.accept_existing.member_insert.failed');
        return { error: 'member_insert_failed' as const };
      }
    }

    await adminClient.from('workspace_invitations').update({ status: 'accepted' }).eq('id', invite.id);

    return { success: true as const, workspaceId: invite.workspace_id };
  } catch (err) {
    logger.error({ err, token }, 'invitations.accept_existing.failed');
    return { error: 'unexpected' as const };
  }
}
