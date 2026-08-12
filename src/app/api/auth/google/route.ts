import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    if (!workspaceId) return NextResponse.redirect(new URL('/settings?error=NoActiveWorkspace', request.url));

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return NextResponse.redirect(new URL('/settings?error=ConfigurationMissing', request.url));

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`;
    const scope = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly';

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scope);
    authUrl.searchParams.append('access_type', 'offline'); 
    authUrl.searchParams.append('prompt', 'consent');

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    return NextResponse.redirect(new URL('/settings?error=AuthInitiationFailed', request.url));
  }
}
