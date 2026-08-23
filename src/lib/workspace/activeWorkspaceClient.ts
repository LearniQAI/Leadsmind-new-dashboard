// Client-side read of the active_workspace_id cookie (set by
// src/components/auth/WorkspaceSync.tsx). Used to prefix storage object
// paths with the real workspace id for buckets that enforce workspace-path
// RLS (see supabase/migrations/20260829000000_lockdown_storage_buckets.sql).
export function getActiveWorkspaceId(): string {
  const match = document.cookie.match(/(?:^|; )active_workspace_id=([^;]+)/);
  const workspaceId = match ? decodeURIComponent(match[1]) : '';
  if (!workspaceId) {
    throw new Error('No active workspace found. Please reload the page and try again.');
  }
  return workspaceId;
}
