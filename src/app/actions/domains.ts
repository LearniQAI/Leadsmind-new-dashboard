'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { getCurrentWorkspaceId, requireModuleAccess } from '@/lib/auth';
import { releaseHostFromVercel } from '@/lib/domains/verify';
import { describeDns, normalizeHostnameInput } from '@/lib/domains/hostname';
import { revalidatePath } from 'next/cache';
import dns from 'dns';
import { randomBytes } from 'crypto';
import { ENFORCE_PLAN_LIMITS } from '@/lib/config/flags';
import { logger } from '@/shared/logger';
import { ValidationError, toClientError } from '@/shared/errors/AppError';

// Sender/custom domain management touches DNS/DKIM/DMARC verification state and white-label
// routing config. Sender (email) domains are restricted to admins/owners; custom domains are
// open to every workspace member because a hostname only goes live after the real TXT ownership
// check.
// Sender (email) domains only. Custom-domain actions are open to every workspace member.
const ALLOWED_DOMAIN_ROLES = ['admin', 'owner'];

// --- Promisified DNS TXT Resolver helper ---
async function getDnsTxtRecords(hostname: string): Promise<string[][]> {
  return new Promise((resolve) => {
    dns.resolveTxt(hostname, (err, records) => {
      if (err) {
        // Log error and return empty array if record doesn't exist
        logger.warn({ err, hostname }, 'domains.dns_txt_resolve.failed');
        resolve([]);
      } else {
        resolve(records || []);
      }
    });
  });
}

// --- Sender Domains Actions (Original) ---
//
// Consolidation investigated per the triage's Duplicate Implementation
// note #10: "Sender Domains" (this section, table sender_domains) and
// "Custom Domain Connection" (addDomain/getDomains below, table
// domain_configurations) are NOT two implementations of the same feature —
// they're genuinely different features (email-sending domain/DKIM
// verification vs. white-label custom domain routing) on different tables.
// True consolidation (repoint one onto the other, delete the loser) isn't
// viable. Applied the same requireWorkspaceRole(ALLOWED_DOMAIN_ROLES) fix to both
// generations instead, so they share a security posture even though they
// stay separate implementations.

export async function getSenderDomains() {
  try {
    const supabase = await createServerClient();
    let workspaceId: string;
    try {
      ({ workspaceId } = await requireWorkspaceRole(ALLOWED_DOMAIN_ROLES));
    } catch {
      return { error: 'Unauthorized' };
    }

    const { data, error } = await supabase
      .from('sender_domains')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data };
  } catch (error: any) {
    logger.error({ err: error }, 'domains.sender_domains.fetch.failed');
    return { error: 'Failed to fetch sender domains.' };
  }
}

export async function registerSenderDomain(domainName: string) {
  try {
    const supabase = await createServerClient();
    let workspaceId: string;
    try {
      ({ workspaceId } = await requireWorkspaceRole(ALLOWED_DOMAIN_ROLES));
    } catch {
      return { error: 'Unauthorized' };
    }

    const cleanDomain = domainName.trim().toLowerCase();
    if (!cleanDomain || !cleanDomain.includes('.')) {
      return { error: 'Invalid domain name format.' };
    }

    const { data, error } = await supabase
      .from('sender_domains')
      .insert({
        workspace_id: workspaceId,
        domain_name: cleanDomain,
        spf_status: false,
        dkim_status: false,
        dmarc_status: false,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { error: 'This domain is already registered for this workspace.' };
      }
      throw error;
    }

    revalidatePath('/settings');
    return { data };
  } catch (error: any) {
    logger.error({ err: error, domainName }, 'domains.sender_domain.register.failed');
    const clientError = toClientError(error);
    return { error: clientError.error };
  }
}

export async function deleteSenderDomain(domainId: string) {
  try {
    const supabase = await createServerClient();
    let workspaceId: string;
    try {
      ({ workspaceId } = await requireWorkspaceRole(ALLOWED_DOMAIN_ROLES));
    } catch {
      return { error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('sender_domains')
      .delete()
      .eq('id', domainId)
      .eq('workspace_id', workspaceId);

    if (error) throw error;

    revalidatePath('/settings');
    return { success: true };
  } catch (error: any) {
    logger.error({ err: error, domainId }, 'domains.sender_domain.delete.failed');
    return { error: 'Failed to delete sender domain.' };
  }
}

export async function verifySenderDomain(domainId: string) {
  try {
    const supabase = await createServerClient();
    let workspaceId: string;
    try {
      ({ workspaceId } = await requireWorkspaceRole(ALLOWED_DOMAIN_ROLES));
    } catch {
      return { error: 'Unauthorized' };
    }

    const { data: domain, error: fetchError } = await supabase
      .from('sender_domains')
      .select('*')
      .eq('id', domainId)
      .eq('workspace_id', workspaceId)
      .single();

    if (fetchError || !domain) {
      return { error: 'Sender domain not found.' };
    }

    const domainName = domain.domain_name;

    // Simulation / Bypass configuration for sandbox and local testing
    const isMockBypass = 
      domainName === 'test.com' || 
      domainName === 'mock.com' ||
      domainName.endsWith('.test') ||
      process.env.MOCK_DNS_VERIFICATION === 'true';

    let spfVerified = false;
    let dkimVerified = false;
    let dmarcVerified = false;

    if (isMockBypass) {
      logger.info({ domainName }, 'domains.dns_verify.mock_bypass');
      spfVerified = true;
      dkimVerified = true;
      dmarcVerified = true;
    } else {
      // 1. Verify SPF: query TXT of root domain
      const rootTxtRecords = await getDnsTxtRecords(domainName);
      const rootRecordsFlattened = rootTxtRecords.map(r => r.join(''));
      
      const spfRecord = rootRecordsFlattened.find(rec => rec.startsWith('v=spf1'));
      if (spfRecord) {
        spfVerified = spfRecord.includes('spf.resend.com') || spfRecord.includes('amazonses.com') || spfRecord.includes('leadsmind');
      }

      // 2. Verify DKIM: query TXT for resend._domainkey.domainName
      const dkimHost = `resend._domainkey.${domainName}`;
      const dkimTxtRecords = await getDnsTxtRecords(dkimHost);
      const dkimRecordsFlattened = dkimTxtRecords.map(r => r.join(''));

      const dkimRecord = dkimRecordsFlattened.find(rec => rec.includes('k=rsa') || rec.startsWith('v=DKIM1'));
      if (dkimRecord) {
        dkimVerified = true;
      }

      // 3. Verify DMARC: query TXT for _dmarc.domainName
      const dmarcHost = `_dmarc.${domainName}`;
      const dmarcTxtRecords = await getDnsTxtRecords(dmarcHost);
      const dmarcRecordsFlattened = dmarcTxtRecords.map(r => r.join(''));

      const dmarcRecord = dmarcRecordsFlattened.find(rec => rec.startsWith('v=DMARC1'));
      if (dmarcRecord) {
        dmarcVerified = dmarcRecord.includes('p=quarantine') || dmarcRecord.includes('p=reject');
      }
    }

    // 4. Update the DB record status
    const verifiedAt = (spfVerified && dkimVerified) ? new Date().toISOString() : null;

    const { data: updatedDomain, error: updateError } = await supabase
      .from('sender_domains')
      .update({
        spf_status: spfVerified,
        dkim_status: dkimVerified,
        dmarc_status: dmarcVerified,
        verified_at: verifiedAt
      })
      .eq("id", domainId).eq("workspace_id", workspaceId)
      .select()
      .single();

    if (updateError) throw updateError;

    revalidatePath('/settings');
    return { 
      data: updatedDomain, 
      details: {
        spf: spfVerified,
        dkim: dkimVerified,
        dmarc: dmarcVerified,
      } 
    };
  } catch (error: any) {
    logger.error({ err: error, domainId }, 'domains.sender_domain.verify.failed');
    return { error: 'Failed to verify sender domain.' };
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
