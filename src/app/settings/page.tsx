import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import SettingsClient from './SettingsClient';
import { getWorkspaceBranding, getWorkspaceMembers, getWebhooks } from '@/app/actions/settings';
import { getDashboardStats } from '@/app/actions/analytics';

export default async function SettingsPage() {
  const [branding, members, webhooks, audit] = await Promise.all([
    getWorkspaceBranding(),
    getWorkspaceMembers(),
    getWebhooks(),
    getDashboardStats(),
  ]);

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-100px)]">
        <div className="mb-10">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white italic leading-none">Antigravity <span className="text-primary">Settings</span></h1>
          <p className="text-white/40 text-sm font-medium mt-2 italic">Control your workspace's identity and global configurations.</p>
        </div>

        <SettingsClient 
          branding={branding.data} 
          members={members.data || []} 
          webhooks={webhooks.data || []} 
          auditData={audit.data}
        />
      </div>
    </Wrapper>
  );
}
