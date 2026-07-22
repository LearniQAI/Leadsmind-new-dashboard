// Shared workspace-role guard for API routes.
//
// Fixes a systemic bug found across hr/employees, hr/leave, hr/time-tracking (and originally
// hr/payroll): getUserAccessInfo() resolves the caller's role from their SESSION COOKIE's
// active workspace, but routes were applying that role to gate an arbitrary client-supplied
// workspaceId query/body param — the two were never checked for equality. A user with a valid
// admin/HR role in their own Workspace B could pass Workspace A's id and the role check would
// still pass, because it never looked at Workspace A at all.
//
// requireWorkspaceRole() closes this by resolving BOTH the workspace and the role from the
// same source — the caller's session — and querying workspace_members directly for
// (user_id, that workspace). A client-supplied workspaceId is never accepted or trusted here.

import { getUser, getCurrentWorkspaceId } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { UnauthorizedError, ForbiddenError } from '@/shared/errors/AppError'

export interface WorkspaceRoleContext {
  userId: string
  userEmail: string | null
  workspaceId: string
  role: string
}

/**
 * Confirms the caller is authenticated and holds a role for the workspace actually being
 * operated on (their session's active workspace) — never a client-supplied workspaceId.
 * Pass `allowedRoles` to additionally require the role be one of a specific set; omit it to
 * just confirm membership (any role) and resolve the workspace/role for further checks.
 */
export async function requireWorkspaceRole(allowedRoles?: readonly string[]): Promise<WorkspaceRoleContext> {
  const user = await getUser()
  if (!user) throw new UnauthorizedError()

  const workspaceId = await getCurrentWorkspaceId()
  if (!workspaceId) throw new ForbiddenError('No active workspace selected')

  const supabase = await createServerClient()
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) throw new ForbiddenError('You are not a member of the active workspace')

  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    throw new ForbiddenError('Insufficient privileges for this resource')
  }

  return { userId: user.id, userEmail: user.email ?? null, workspaceId, role: membership.role }
}
