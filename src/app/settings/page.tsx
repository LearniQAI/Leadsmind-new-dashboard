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
      <div className="flex flex-col min-h-screen">
        {/* Page Header Area */}
        <div className="px-8 py-8 border-b border-white/5 bg-n900">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col">
              <h1 className="text-[24px] md:text-[32px] font-space font-black text-t1 tracking-tighter leading-tight uppercase">
                Workspace <span className="text-accent2">Settings</span>
              </h1>
              <p className="text-[11px] md:text-[12px] text-t3 font-black uppercase tracking-[0.25em] mt-1">
                Control your neural workspace identity and global configurations
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/5 border border-accent/10 text-accent text-[11px] font-black uppercase tracking-widest shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></div>
                System Active
              </div>
            </div>
          </div>
        </div>

        {/* Main Settings Client */}
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
