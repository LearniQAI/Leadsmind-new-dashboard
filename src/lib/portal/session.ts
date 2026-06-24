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
  const { data: contactsData } = await supabase
    .from('contacts')
    .select('*')
    .eq('email', user.email)
    .eq('portal_access_enabled', true)
    .eq('portal_access_revoked', false);

  if (!contactsData || contactsData.length === 0) return null;

  // Fetch workspaces for these contacts separately to bypass PostgREST join limits
  const workspaceIds = Array.from(new Set(contactsData.map(c => c.workspace_id)));
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('*')
    .in('id', workspaceIds);

  const contacts = contactsData.map(c => ({
    ...c,
    workspace: workspaces?.find(w => w.id === c.workspace_id) || null
  })) as any[];

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
    const { data: impersonatedContactData } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', impersonateId)
      .single();

    if (impersonatedContactData) {
      // Validate that the logged-in user is an admin of this contact's workspace
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', impersonatedContactData.workspace_id)
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (membership) {
        // Fetch workspace separately
        const { data: ws } = await supabase
          .from('workspaces')
          .select('*')
          .eq('id', impersonatedContactData.workspace_id)
          .single();

        const impersonatedContact = {
          ...impersonatedContactData,
          workspace: ws || null
        } as any;

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
