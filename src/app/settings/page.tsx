import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import SettingsClient from './SettingsClient';
import { getWorkspaceBranding, getWorkspaceMembers, getWebhooks, getWorkspaceInvitations } from '@/app/actions/settings';
import { getDashboardStats } from '@/app/actions/analytics';

export default async function SettingsPage() {
  const [branding, members, webhooks, audit, invitations] = await Promise.all([
    getWorkspaceBranding(),
    getWorkspaceMembers(),
    getWebhooks(),
    getDashboardStats(),
    getWorkspaceInvitations(),
  ]);

  return (
    <Wrapper>
      <div className="flex flex-col min-h-screen">
        {/* ... (header part) ... */}
        {/* Main Settings Client */}
        <SettingsClient 
          branding={branding.data} 
          members={members.data || []} 
          invitations={invitations.data || []}
          webhooks={webhooks.data || []} 
          auditData={audit.data}
        />
      </div>
    </Wrapper>
  );
}
