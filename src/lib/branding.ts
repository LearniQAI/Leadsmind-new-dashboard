'use server';

import { createServerClient } from '@/lib/supabase/server';
import { WorkspaceBranding } from '@/types/branding.types';

// Remove Orphaned Custom-Domain Code pass — saveBranding(), verifyDomain(), and
// provisionVercelDomain() used to live here. Confirmed via a whole-codebase search (grep for
// each identifier) that none of the three ever had a real caller anywhere outside this file —
// the actual live branding-save flow SettingsClient.tsx uses is updateWorkspaceBranding() in
// src/app/actions/settings.ts, a separate implementation that never called into this one. All
// three were pure dead code: saveBranding()'s only interesting behavior (the
// provisionVercelDomain side effect on workspace_branding.custom_domain) fed a column nothing
// has read for serving since the real domain_configurations-based system was built — and
// verifyDomain()'s own DNS-over-HTTPS check was a second, also-dead, competing implementation
// of what verifyCustomDomainCname() (settings.ts, also removed this pass) already did for real.
// fetchBranding() below is untouched — it's the real, actively-used read path (src/app/layout.tsx
// calls it for logo/colors/platform name on every request).
export async function fetchBranding(workspaceId: string): Promise<WorkspaceBranding | null> {
 const supabase = await createServerClient();
 const { data } = await supabase
  .from('workspace_branding')
  .select('*')
  .eq('workspace_id', workspaceId)
  .maybeSingle();
 return data ?? null;
}
