export type UserRole = 'admin' | 'member' | 'client';

export interface Profile {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface AuthSession {
  user: {
    id: string;
    email?: string;
  };
  accessToken: string;
  expiresAt: number;
}
