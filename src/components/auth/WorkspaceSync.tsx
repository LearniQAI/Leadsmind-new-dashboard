'use client';

import { useEffect } from 'react';

interface WorkspaceSyncProps {
 workspaceId: string | null;
}

export function WorkspaceSync({ workspaceId }: WorkspaceSyncProps) {
 useEffect(() => {
  if (!workspaceId) return;

  // Helper to get cookie value by name
  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const currentCookieValue = getCookie('active_workspace_id');
  
  if (currentCookieValue !== workspaceId) {
   // Set/override cookie via document.cookie
   document.cookie = `active_workspace_id=${workspaceId}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  }
 }, [workspaceId]);

 return null;
}
