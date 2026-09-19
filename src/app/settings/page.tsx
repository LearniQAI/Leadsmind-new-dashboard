import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import SettingsClient from './SettingsClient';
import { getWorkspaceBranding, getWorkspaceMembers, getWebhooks, getWorkspaceInvitations } from '@/app/actions/settings';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { getDashboardStats } from '@/app/actions/analytics';
import { getWorkspaceBillingInfo } from '@/app/actions/finance';

export default async function SettingsPage() {
  // Resolved from the active workspace itself. workspace_branding is created lazily (most
  // workspaces have no row), so branding?.workspace_id must never be used as the workspace id.
  const [workspaceId, branding, members, webhooks, audit, invitations, billing] = await Promise.all([
    getCurrentWorkspaceId(),
    getWorkspaceBranding(),
    getWorkspaceMembers(),
    getWebhooks(),
    getDashboardStats(),
    getWorkspaceInvitations(),
    getWorkspaceBillingInfo(),
  ]);

  return (
    <Wrapper>
      <div className="flex flex-col min-h-screen">
        {/* ... (header part) ... */}
        {/* Main Settings Client */}
        <SettingsClient
          workspaceId={workspaceId}
          branding={branding.data}
          members={members.data || []}
          invitations={invitations.data || []}
          webhooks={webhooks.data || []}
          auditData={audit.data}
          billing={billing}
        />
      </div>
    </Wrapper>
  );
}
