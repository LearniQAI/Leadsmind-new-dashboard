'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import dns from 'dns';
import { randomBytes } from 'crypto';
import { ENFORCE_PLAN_LIMITS } from '@/lib/config/flags';
import { logger } from '@/shared/logger';
import { ValidationError, toClientError } from '@/shared/errors/AppError';

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
// viable. Applied the same requireWorkspaceAccess() mechanical fix to both
// generations instead, so they share a security posture even though they
// stay separate implementations.

export async function getSenderDomains() {
  try {
    const supabase = await createServerClient();
    let workspaceId: string;
    try {
      ({ workspaceId } = await requireWorkspaceAccess());
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
      ({ workspaceId } = await requireWorkspaceAccess());
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
      ({ workspaceId } = await requireWorkspaceAccess());
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
      ({ workspaceId } = await requireWorkspaceAccess());
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

  const tier = workspace.plan_tier || 'free';
  if (!['starter', 'growth', 'agency', 'enterprise'].includes(tier)) {
    throw new ValidationError('Custom domains are only available on Starter, Growth, Agency, and Enterprise plans.');
  }
}

// --- Custom Domain Connection Actions (New) ---

export async function addDomain(
  workspaceId: string,
  hostname: string,
  domainType: 'apex' | 'subdomain' | 'wildcard' = 'subdomain'
) {
  try {
    const supabaseAuth = await createServerClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return { success: false, error: 'Unauthorized' };

    const { data: member } = await supabaseAuth
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!member) return { success: false, error: 'Forbidden' };

    await checkPlanGateForCustomDomain(workspaceId);

    const cleanHostname = hostname.trim().toLowerCase();
    if (!cleanHostname) {
      return { success: false, error: 'Hostname is required.' };
    }

    const adminClient = createAdminClient();

    const { data: existingDomain } = await adminClient
      .from('domain_configurations')
      .select('id, workspace_id')
      .eq('hostname', cleanHostname)
      .maybeSingle();

    if (existingDomain) {
      if (existingDomain.workspace_id === workspaceId) {
        return { success: false, error: 'This domain is already added to this workspace.' };
      } else {
        return { success: false, error: 'This domain is already registered to another workspace.' };
      }
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

    if (error) throw error;
    revalidatePath('/settings/domains');
    return { success: true, data: domainConfig };
  } catch (err: any) {
    logger.error({ err, workspaceId, hostname }, 'domains.custom_domain.add.failed');
    const clientError = toClientError(err);
    return { success: false, error: clientError.error };
  }
}

export async function getDomains(workspaceId: string) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Unauthorized' };

    const { data: member } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!member) return { success: false, error: 'Forbidden' };

    const { data, error } = await supabase
      .from('domain_configurations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
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
      ({ workspaceId } = await requireWorkspaceAccess());
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
  try {
    const supabase = await createServerClient();
    let workspaceId: string;
    try {
      ({ workspaceId } = await requireWorkspaceAccess());
    } catch {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('domain_configurations')
      .delete()
      .eq("id", domainId).eq("workspace_id", workspaceId);

    if (error) throw error;
    revalidatePath('/settings/domains');
    return { success: true };
  } catch (err: any) {
    logger.error({ err, domainId }, 'domains.custom_domain.delete.failed');
    return { success: false, error: 'Failed to delete domain.' };
  }
}
