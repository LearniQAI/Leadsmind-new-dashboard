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

  return (
    <>
      {children}
    </>
  );
}
