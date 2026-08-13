const fs = require('fs');
const path = require('path');

const API_DIR = path.join(process.cwd(), 'src', 'app', 'api', 'auth', 'microsoft');
const CALLBACK_DIR = path.join(API_DIR, 'callback');

if (!fs.existsSync(API_DIR)) fs.mkdirSync(API_DIR, { recursive: true });
if (!fs.existsSync(CALLBACK_DIR)) fs.mkdirSync(CALLBACK_DIR, { recursive: true });

// File 1: microsoft/route.ts
const msRouteTs = `import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth';

export async function GET(request) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    if (!workspaceId) return NextResponse.redirect(new URL('/settings?error=NoActiveWorkspace', request.url));

    const clientId = process.env.MICROSOFT_CLIENT_ID;
    if (!clientId) return NextResponse.redirect(new URL('/settings?error=ConfigurationMissing', request.url));

    const redirectUri = \`\${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/microsoft/callback\`;
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
`;
fs.writeFileSync(path.join(API_DIR, 'route.ts'), msRouteTs);

// File 2: microsoft/callback/route.ts
const msCallbackTs = `import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) return NextResponse.redirect(new URL('/settings?error=AccessDenied', request.url));
  if (!code) return NextResponse.redirect(new URL('/settings?error=NoCodeProvided', request.url));

  try {
    const redirectUri = \`\${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/microsoft/callback\`;

    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) throw new Error('Failed to fetch tokens from Microsoft');
    const tokens = await tokenResponse.json();

    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const { error: dbError } = await supabase
      .from('platform_connections')
      .upsert({
        workspace_id: workspaceId,
        platform: 'outlook_calendar',
        status: 'connected',
        credentials: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token, 
          expiry_date: Date.now() + tokens.expires_in * 1000,
        }
      }, { onConflict: 'workspace_id, platform' });

    if (dbError) throw dbError;
    return NextResponse.redirect(new URL('/settings?success=MicrosoftCalendarConnected', request.url));
  } catch (err) {
    return NextResponse.redirect(new URL('/settings?error=OAuthFailed', request.url));
  }
}
`;
fs.writeFileSync(path.join(CALLBACK_DIR, 'route.ts'), msCallbackTs);

// 3. Connect the UI button!
const modalPath = path.join(process.cwd(), 'src', 'components', 'settings', 'ConnectProviderModal.tsx');
let modalCode = fs.readFileSync(modalPath, 'utf8');
if (!modalCode.includes('window.location.href = "/api/auth/microsoft"')) {
  modalCode = modalCode.replace(
    /if \(provider\.toLowerCase\(\)\.includes\('google'\)\) \{\s*window\.location\.href = "\/api\/auth\/google";\s*return;\s*\}/,
    `if (provider.toLowerCase().includes('google')) {
        window.location.href = "/api/auth/google";
        return;
      }
      if (provider.toLowerCase().includes('outlook')) {
        window.location.href = "/api/auth/microsoft";
        return;
      }`
  );
  fs.writeFileSync(modalPath, modalCode);
}

console.log("SUCCESS! Microsoft Outlook OAuth backend is injected!");