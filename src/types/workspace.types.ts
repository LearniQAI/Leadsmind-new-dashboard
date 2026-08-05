import { UserRole } from './auth.types';
import { PlanTier } from './planTier.types';

export interface Workspace {
 id: string;
 name: string;
 slug: string;
 logoUrl: string | null;
 ownerId: string;
 plan: PlanTier;
 createdAt: string;
}

export interface WorkspaceMember {
 id: string;
 workspaceId: string;
 userId: string;
 role: UserRole;
 joinedAt: string;
}
