import { getCurrentProfile, getCurrentWorkspace, getUserRole } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { WorkspaceSync } from '@/components/auth/WorkspaceSync';
import { redirect } from 'next/navigation';
import React from 'react';
import { fetchBranding } from '@/lib/branding';
import { DashboardProvider } from '@/components/layouts/DashboardProvider';
import { BrandingProvider } from '@/components/branding/BrandingProvider';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  
  if (!authUser) redirect('/auth/signin-basic');

  const [profile, workspace, role] = await Promise.all([
    getCurrentProfile(authUser),
    getCurrentWorkspace(authUser),
    getUserRole(),
  ]);

  const branding = workspace ? await fetchBranding(workspace.id) : null;

  const user = {
    id: authUser.id,
    email: authUser.email,
    firstName: profile?.firstName || authUser.user_metadata?.full_name?.split(' ')[0] || authUser.email?.split('@')[0] || 'User',
    avatarUrl: profile?.avatarUrl ?? null,
  };

  const workspaceData = workspace
    ? {
        id: workspace.id,
        name: workspace.name,
        logoUrl: workspace.logoUrl ?? null,
        plan: workspace.plan,
      }
    : null;

  return (
    <>
      <WorkspaceSync workspaceId={workspaceData?.id ?? null} />
      <DashboardProvider 
        user={user} 
        workspace={workspaceData} 
        role={role} 
        branding={{ platformName: branding?.platform_name, logoUrl: branding?.logo_url }}
      >
        <BrandingProvider 
          primaryColor={branding?.primary_color}
          platformName={branding?.platform_name}
        >
          {children}
        </BrandingProvider>
      </DashboardProvider>
    </>
  );
}
