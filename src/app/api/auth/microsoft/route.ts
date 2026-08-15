import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth';

export async function GET(request) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    if (!workspaceId) return NextResponse.redirect(new URL('/settings?error=NoActiveWorkspace', request.url));

    const clientId = process.env.MICROSOFT_CLIENT_ID;
    if (!clientId) return NextResponse.redirect(new URL('/settings?error=ConfigurationMissing', request.url));

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/microsoft/callback`;
    const scope = 'offline_access Calendars.ReadWrite';

    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scope);
    authUrl.searchParams.append('prompt', 'consent');

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    return NextResponse.redirect(new URL('/settings?error=AuthInitiationFailed', request.url));
  }
}
