import { generateUnsubscribeToken } from '@/lib/security/unsubscribeToken';

// Shared by every real outbound-campaign send path (dispatch worker,
// updateCampaign's direct-email path) so there is exactly one place that
// knows the unsubscribe URL shape — matching src/app/public/unsubscribe/page.tsx's
// expected email/workspace_id/token query params.
export function buildUnsubscribeLink(email: string, workspaceId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://leadsmind-new-dashboard.vercel.app';
  const token = generateUnsubscribeToken(email, workspaceId);
  return `${baseUrl}/public/unsubscribe?email=${encodeURIComponent(email)}&workspace_id=${encodeURIComponent(workspaceId)}&token=${token}`;
}
