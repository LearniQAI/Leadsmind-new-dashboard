import { requireWorkspaceRole, WorkspaceRoleContext } from '@/lib/api/workspaceAuth';

// Roles allowed to manage course content (courses/modules/lessons/quiz questions & settings/
// automation rules) and view all-student analytics (struggle scores). Matches the existing
// "instructor" convention already used in lms/assignments/route.ts — 'member' here means an
// internal team member (as opposed to 'client'/'viewer'/'hr'/'payroll'/'compliance'), not a
// generic low-privilege role.
export const LMS_INSTRUCTOR_ROLES = ['admin', 'member'] as const;

export async function requireLmsInstructor(): Promise<WorkspaceRoleContext> {
  return requireWorkspaceRole(LMS_INSTRUCTOR_ROLES);
}
