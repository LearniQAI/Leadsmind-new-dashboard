'use server';

import { createServerClient } from '@/lib/supabase/server';
import { WorkspaceBranding, DomainVerificationResult } from '@/types/branding.types';
import { revalidatePath } from 'next/cache';

export async function fetchBranding(workspaceId: string): Promise<WorkspaceBranding | null> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('workspace_branding')
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  return data ?? null;
}

export async function saveBranding(
  workspaceId: string,
  updates: Partial<Omit<WorkspaceBranding, 'id' | 'workspace_id' | 'updated_at'>>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('workspace_branding')
    .upsert(
      {
        workspace_id: workspaceId,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id' }
    );

  if (error) return { success: false, error: error.message };

  if (updates.custom_domain) {
    // Attempt to provision on infrastructure asynchronously so we don't block the UI save completely
    provisionVercelDomain(updates.custom_domain).catch(err => console.error("Async Vercel Provision Error:", err));
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function verifyDomain(domain: string): Promise<DomainVerificationResult> {
  if (!domain) return { status: 'error', message: 'No domain provided.' };

  try {
    // Use a DNS-over-HTTPS lookup to check CNAME record
    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];
    const resp = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=CNAME`,
      { next: { revalidate: 0 } }
    );
    const json = await resp.json();

    if (json.Status === 0 && json.Answer && json.Answer.length > 0) {
      return { status: 'verified', message: 'Domain CNAME record found and verified.' };
    }
    return {
      status: 'pending',
      message: 'CNAME record not yet found. DNS changes can take up to 24–48 hours to propagate.',
    };
  } catch {
    return { status: 'error', message: 'Could not reach DNS. Check your domain and try again.' };
  }
}

/**
 * Provisions a custom domain dynamically to the Vercel project via the Vercel API.
 * Requires VERCEL_API_TOKEN and VERCEL_PROJECT_ID environment variables.
 */
export async function provisionVercelDomain(domain: string): Promise<{ success: boolean; message: string }> {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!token || !projectId) {
    console.warn("Vercel credentials missing. Skipping automated domain provisioning.");
    return { success: false, message: "Server configuration missing Vercel API credentials." };
  }

  try {
    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];
    
    const response = await fetch(`https://api.vercel.com/v10/projects/${projectId}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: cleanDomain }),
    });

    if (!response.ok) {
      const data = await response.json();
      return { success: false, message: data.error?.message || 'Failed to add domain to project.' };
    }

    return { success: true, message: 'Domain successfully provisioned on infrastructure.' };
  } catch (error) {
    console.error("Vercel provisioning error:", error);
    return { success: false, message: "An unexpected error occurred while provisioning the domain." };
  }
}
