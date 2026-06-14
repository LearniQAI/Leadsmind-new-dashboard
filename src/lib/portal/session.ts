import { getUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export interface PortalSession {
  user: any;
  contact: any;
  workspace: any;
  branding: any;
  allContacts: any[];
  isImpersonating: boolean;
}

export async function getPortalSession(): Promise<PortalSession | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = createAdminClient();

  // 1. Fetch all contacts matching the authenticated user's email who have active portal access
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*, workspace:workspaces(*)')
    .eq('email', user.email)
    .eq('portal_access_enabled', true)
    .eq('portal_access_revoked', false);

  if (!contacts || contacts.length === 0) return null;

  const cookieStore = cookies();
  const impersonateId = cookieStore.get('impersonate_contact_id')?.value;

  // Helper to fetch branding
  const fetchBranding = async (workspaceId: string) => {
    const { data } = await supabase
      .from('workspace_branding')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    return data || null;
  };

  // 2. Impersonation Check
  if (impersonateId) {
    const { data: impersonatedContact } = await supabase
      .from('contacts')
      .select('*, workspace:workspaces(*)')
      .eq('id', impersonateId)
      .single();

    if (impersonatedContact) {
      // Validate that the logged-in user is an admin of this contact's workspace
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', impersonatedContact.workspace_id)
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (membership) {
        const branding = await fetchBranding(impersonatedContact.workspace_id);
        return {
          user,
          contact: impersonatedContact,
          workspace: impersonatedContact.workspace,
          branding,
          allContacts: contacts,
          isImpersonating: true,
        };
      }
    }
  }

  // 3. Normal workspace/tenant mapping
  let activeWorkspaceId = cookieStore.get('active_workspace_id')?.value;
  let activeContact = contacts.find(c => c.workspace_id === activeWorkspaceId);

  if (!activeContact) {
    activeContact = contacts[0];
    activeWorkspaceId = activeContact.workspace_id;
    try {
      cookieStore.set('active_workspace_id', activeWorkspaceId, {
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
      });
    } catch {
      // Ignore client/server set-cookie limits in server components
    }
  }

  const branding = await fetchBranding(activeWorkspaceId);

  return {
    user,
    contact: activeContact,
    workspace: activeContact.workspace,
    branding,
    allContacts: contacts,
    isImpersonating: false,
  };
}
