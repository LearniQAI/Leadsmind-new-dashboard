'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { getCurrentWorkspaceId, requireModuleAccess } from '@/lib/auth';
import { releaseHostFromVercel } from '@/lib/domains/verify';
import { describeDns, normalizeHostnameInput } from '@/lib/domains/hostname';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import {
  registerSendingDomain,
  refreshSendingDomain,
  removeSendingDomain,
  updateSendingDomainIdentity,
  SendingDomainError,
} from '@/lib/email/sendingDomains';
import { getDomainReputation, REPUTATION_POLICY } from '@/lib/email/reputation';
import {
  DEFAULT_DOMAIN_HOURLY_LIMIT,
  DEFAULT_WORKSPACE_DAILY_LIMIT,
  DEFAULT_WORKSPACE_HOURLY_LIMIT,
} from '@/lib/email/managedSender';
import { ENFORCE_PLAN_LIMITS } from '@/lib/config/flags';
import { logger } from '@/shared/logger';
import { ValidationError, toClientError } from '@/shared/errors/AppError';

// Sender/custom domain management touches DNS/DKIM/DMARC verification state and white-label
// routing config. Sender (email) domains are restricted to admins/owners; custom domains are
// open to every workspace member because a hostname only goes live after the real TXT ownership
// check.
// Sender (email) domains only. Custom-domain actions are open to every workspace member.
const ALLOWED_DOMAIN_ROLES = ['admin', 'owner'];

// --- Sender Domains Actions (LeadsMind-managed sending) ---
//
// Consolidation investigated per the triage's Duplicate Implementation
// note #10: "Sender Domains" (this section, table sender_domains) and
// "Custom Domain Connection" (addDomain/getDomains below, table
// domain_configurations) are NOT two implementations of the same feature —
// they're genuinely different features (email-sending domain vs. white-label
// custom domain routing) on different tables. See ADR-0004.
//
// Sending domains live in LeadsMind's own Resend account (lib/email/sendingDomains.ts): the
// domain is created through Resend's API and Resend's own verification status is stored and
// trusted. Every write goes through these admin/owner actions and the service role; sender_domains
// has no client write policy.

async function senderDomainAdmin(): Promise<string | null> {
  try {
    return (await requireWorkspaceRole(ALLOWED_DOMAIN_ROLES)).workspaceId;
  } catch {
    return null;
  }
}

type SenderDomainResult = { data?: any; error?: string; success?: boolean };

function senderDomainError(err: unknown, event: string, fallback: string, ctx: Record<string, unknown>): SenderDomainResult {
  if (err instanceof SendingDomainError) return { error: err.message };
  logger.error({ err, ...ctx }, event);
  return { error: fallback };
}

export async function getSenderDomains() {
  try {
    const workspaceId = await senderDomainAdmin();
    if (!workspaceId) return { error: 'Unauthorized' };
    const db = createAdminClient();

    const { data, error } = await db
      .from('sender_domains')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Reputation over the policy window, per domain (drives the auto-pause shown in the UI).
    const withReputation = await Promise.all(
      (data ?? []).map(async (d) => ({ ...d, reputation: await getDomainReputation(db as any, d.id).catch(() => null) })),
    );
    const { data: limits } = await db.from('email_sending_limits').select('hourly_limit, daily_limit').eq('workspace_id', workspaceId).maybeSingle();

    return {
      data: withReputation,
      limits: {
        workspaceHourly: limits?.hourly_limit ?? DEFAULT_WORKSPACE_HOURLY_LIMIT,
        workspaceDaily: limits?.daily_limit ?? DEFAULT_WORKSPACE_DAILY_LIMIT,
        domainHourlyDefault: DEFAULT_DOMAIN_HOURLY_LIMIT,
      },
      policy: REPUTATION_POLICY,
    };
  } catch (error: any) {
    logger.error({ err: error }, 'domains.sender_domains.fetch.failed');
    return { error: 'Failed to fetch sender domains.' };
  }
}

export async function registerSenderDomain(domainName: string): Promise<SenderDomainResult> {
  const workspaceId = await senderDomainAdmin();
  if (!workspaceId) return { error: 'Unauthorized' };
  try {
    const data = await registerSendingDomain(workspaceId, domainName);
    revalidatePath('/settings');
    return { data };
  } catch (err) {
    return senderDomainError(err, 'domains.sender_domain.register.failed', 'Failed to add sending domain.', { domainName });
  }
}

export async function deleteSenderDomain(domainId: string): Promise<SenderDomainResult> {
  const workspaceId = await senderDomainAdmin();
  if (!workspaceId) return { error: 'Unauthorized' };
  try {
    await removeSendingDomain(workspaceId, domainId);
    revalidatePath('/settings');
    return { success: true };
  } catch (err) {
    return senderDomainError(err, 'domains.sender_domain.delete.failed', 'Failed to delete sender domain.', { domainId });
  }
}

/** Asks Resend to re-check the domain's DNS now and stores Resend's answer. */
export async function verifySenderDomain(domainId: string): Promise<SenderDomainResult> {
  const workspaceId = await senderDomainAdmin();
  if (!workspaceId) return { error: 'Unauthorized' };
  try {
    const data = await refreshSendingDomain(workspaceId, domainId);
    revalidatePath('/settings');
    return { data };
  } catch (err) {
    return senderDomainError(err, 'domains.sender_domain.verify.failed', 'Failed to verify sender domain.', { domainId });
  }
}

export async function updateSenderDomainIdentity(
  domainId: string,
  patch: { fromLocalPart?: string; fromName?: string | null; makeDefault?: boolean },
): Promise<SenderDomainResult> {
  const workspaceId = await senderDomainAdmin();
  if (!workspaceId) return { error: 'Unauthorized' };
  try {
    const data = await updateSendingDomainIdentity(workspaceId, domainId, patch);
    revalidatePath('/settings');
    return { data };
  } catch (err) {
    return senderDomainError(err, 'domains.sender_domain.identity.failed', 'Failed to update the From identity.', { domainId });
  }
}

// --- Plan Gate Helpers (New Custom Domains) ---

async function checkPlanGateForCustomDomain(workspaceId: string) {
  if (!ENFORCE_PLAN_LIMITS) return;
  const supabase = createAdminClient();
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .select('plan_tier')
    .eq('id', workspaceId)
    .single();

  if (wsError || !workspace) {
    throw new ValidationError('Workspace not found or unauthorized access.');
  }

  const tier = workspace.plan_tier || 'spark';
  if (!['rise', 'surge', 'infinity', 'dynasty'].includes(tier)) {
    throw new ValidationError('Custom domains are only available on Rise, Surge, Infinity, and Dynasty plans.');
  }
}

// --- Custom Domain Connection Actions (New) ---

export async function addDomain(
  workspaceId: string,
  hostname: string
) {
  await requireModuleAccess('settings');
  try {
    const supabaseAuth = await createServerClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return { success: false, error: 'Unauthorized' };

    const { data: member } = await supabaseAuth
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();
    // Any workspace member may manage custom domains: a domain only goes live after the real DNS
    // TXT ownership check, so a role gate adds nothing. (Sender/email domains stay admin/owner.)
    if (!member) return { success: false, error: 'You are not a member of this workspace.' };

    await checkPlanGateForCustomDomain(workspaceId);

    const cleanHostname = normalizeHostnameInput(hostname);
    if (!cleanHostname) {
      return { success: false, error: 'Hostname is required.' };
    }
    // Classified server-side with the Public Suffix List (never trusted from the client), so
    // example.co.uk is correctly an apex domain and the right DNS records are shown.
    const dnsGuidance = describeDns(cleanHostname);
    if (!dnsGuidance) {
      return { success: false, error: 'Enter a valid domain, like app.yourdomain.com.' };
    }
    const domainType = dnsGuidance.domainType;

    const adminClient = createAdminClient();

    // Only a PROVEN claim (TXT token passed) makes a hostname exclusive. An unproven entry from
    // another workspace never blocks this one — whichever workspace proves ownership first wins
    // at Verify time (see claimHostOwnership in lib/domains/verify.ts).
    const { data: existingDomains } = await adminClient
      .from('domain_configurations')
      .select('id, workspace_id, ownership_verified_at')
      .eq('hostname', cleanHostname);

    for (const existing of existingDomains ?? []) {
      if (existing.workspace_id === workspaceId) {
        return { success: false, error: 'This domain is already added to this workspace.' };
      }
      if (existing.ownership_verified_at) {
        return { success: false, error: 'This domain is already registered to another workspace.' };
      }
    }

    // Same one-host-one-content-type rule as the website builder's own domains.
    const { data: websiteDomain } = await adminClient
      .from('builder_published_domains')
      .select('id')
      .eq('domain_name', cleanHostname)
      .not('ownership_verified_at', 'is', null)
      .limit(1);
    if (websiteDomain && websiteDomain.length > 0) {
      return { success: false, error: 'This domain is already connected to a website.' };
    }

    const verificationToken = randomBytes(32).toString('hex');

    const supabase = await createServerClient();
    const { data: domainConfig, error } = await supabase
      .from('domain_configurations')
      .insert({
        workspace_id: workspaceId,
        hostname: cleanHostname,
        domain_type: domainType,
        status: 'pending',
        verification_token: verificationToken,
        routing_config: {}
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return { success: false, error: 'This domain is already added to this workspace.' };
      throw error;
    }
    revalidatePath('/settings/domains');
    return { success: true, data: domainConfig };
  } catch (err: any) {
    logger.error({ err, workspaceId, hostname }, 'domains.custom_domain.add.failed');
    const clientError = toClientError(err);
    return { success: false, error: clientError.error };
  }
}

// Same data as getDomains() below, just resolving the caller's own active workspace from
// the session instead of requiring the client to already know its id — used by the course
// creation wizard (Phase D), which has no other reason to have fetched a workspaceId yet.
export async function getDomainsForCurrentWorkspace() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'No workspace active' };
  return getDomains(workspaceId);
}

export async function getDomains(workspaceId: string) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Unauthorized' };

    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();
    // Any workspace member may manage custom domains: a domain only goes live after the real DNS
    // TXT ownership check, so a role gate adds nothing. (Sender/email domains stay admin/owner.)
    if (!member) return { success: false, error: 'You are not a member of this workspace.' };

    const { data, error } = await supabase
      .from('domain_configurations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    // Attach the records to enter at the registrar (computed with the Public Suffix List, which
    // the client can't do), so the UI never guesses the CNAME/TXT host from the label count.
    return { success: true, data: (data ?? []).map((d) => ({ ...d, dns: describeDns(d.hostname) })) };
  } catch (err: any) {
    logger.error({ err, workspaceId }, 'domains.custom_domains.fetch.failed');
    return { success: false, error: 'Failed to fetch domains.' };
  }
}

export async function updateDomainRouting(domainId: string, routingConfig: any) {
  try {
    const supabase = await createServerClient();
    let workspaceId: string;
    try {
      ({ workspaceId } = await requireWorkspaceRole());
    } catch {
      return { success: false, error: 'Unauthorized' };
    }

    const { data, error } = await supabase
      .from('domain_configurations')
      .update({
        routing_config: routingConfig,
        updated_at: new Date().toISOString()
      })
      .eq("id", domainId).eq("workspace_id", workspaceId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    logger.error({ err, domainId }, 'domains.routing.update.failed');
    return { success: false, error: 'Failed to update domain routing.' };
  }
}

export async function deleteDomain(domainId: string) {
  await requireModuleAccess('settings');
  try {
    const supabase = await createServerClient();
    let workspaceId: string;
    try {
      ({ workspaceId } = await requireWorkspaceRole());
    } catch {
      return { success: false, error: 'Unauthorized' };
    }

    const adminClient = createAdminClient();
    const { data: domain } = await adminClient
      .from('domain_configurations')
      .select('id, hostname, ownership_verified_at')
      .eq('id', domainId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (!domain) return { success: false, error: 'Domain not found.' };

    // Courses pointing at this domain are nulled by the courses_domain_id_fkey ON DELETE SET
    // NULL and fall back to the default domain; count them first so the user is told.
    const { count: detachedCourses } = await adminClient
      .from('courses')
      .select('id', { count: 'exact', head: true })
      .eq('domain_id', domainId);

    // Detach from Vercel FIRST. If that fails the row is kept: deleting it anyway would leave
    // the hostname attached to the project with no record left to find or retry it by.
    const released = await releaseHostFromVercel(domain.hostname, domain.ownership_verified_at);
    if (!released.ok) return { success: false, error: released.error };

    const { error } = await supabase
      .from('domain_configurations')
      .delete()
      .eq("id", domainId).eq("workspace_id", workspaceId);

    if (error) throw error;
    revalidatePath('/settings/domains');
    return { success: true, detachedCourses: detachedCourses ?? 0 };
  } catch (err: any) {
    logger.error({ err, domainId }, 'domains.custom_domain.delete.failed');
    return { success: false, error: 'Failed to delete domain.' };
  }
}
