import { ForbiddenError, UnauthorizedError } from '@/shared/errors/AppError';

/**
 * Cross-tenant maintenance actions are controlled outside tenant data. Configure only
 * immutable auth-user UUIDs in server-side settings: PLATFORM_OPERATOR_USER_IDS="id,id".
 * An unset allowlist denies everyone, rather than treating workspace admins as staff.
 */
export function isPlatformOperatorId(userId: string, configuredIds = process.env.PLATFORM_OPERATOR_USER_IDS): boolean {
  return !!configuredIds && configuredIds.split(',').map(id => id.trim()).filter(Boolean).includes(userId);
}

export async function requirePlatformOperator(): Promise<{ userId: string; email: string | null }> {
  const { getUser } = await import('@/lib/auth');
  const user = await getUser();
  if (!user) throw new UnauthorizedError();
  if (!isPlatformOperatorId(user.id)) throw new ForbiddenError('Platform operator privileges are required');
  return { userId: user.id, email: user.email ?? null };
}
