import { UserRole } from './auth.types';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  ownerId: string;
  plan: 'free' | 'pro' | 'enterprise' | 'agency';
  createdAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: UserRole;
  joinedAt: string;
}
