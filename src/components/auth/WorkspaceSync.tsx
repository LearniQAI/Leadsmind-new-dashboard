'use client';

import { useEffect } from 'react';

interface WorkspaceSyncProps {
  workspaceId: string | null;
}

export function WorkspaceSync({ workspaceId }: WorkspaceSyncProps) {
  useEffect(() => {
    if (!workspaceId) return;

    // Check if cookie exists (basic check)
    const hasCookie = document.cookie.includes('active_workspace_id');
    
    if (!hasCookie) {
      // Set cookie via document.cookie as a fallback for client-side navigation
      document.cookie = `active_workspace_id=${workspaceId}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    }
  }, [workspaceId]);

  return null;
}
