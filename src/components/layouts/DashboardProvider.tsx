'use client';

import React, { createContext, useContext } from 'react';

interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string | null;
  avatarUrl?: string | null;
}

interface Workspace {
  id: string;
  name: string;
  logoUrl?: string | null;
  plan?: string;
}

interface Branding {
  platformName?: string | null;
  logoUrl?: string | null;
}

interface DashboardContextType {
  user: User | null;
  workspace: Workspace | null;
  enrichedWorkspace: (Workspace & { branding?: Branding | null }) | null;
  branding: Branding | null;
  role: string | null;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({
  children,
  user,
  workspace,
  branding,
  role,
}: {
  children: React.ReactNode;
  user: User | null;
  workspace: Workspace | null;
  branding: Branding | null;
  role: string | null;
}) {
  const enrichedWorkspace = workspace ? { ...workspace, branding } : null;

  return (
    <DashboardContext.Provider value={{ user, workspace, enrichedWorkspace, branding, role }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext() {
  const context = useContext(DashboardContext);
  return context || { user: null, workspace: null, enrichedWorkspace: null, branding: null, role: null };
}
