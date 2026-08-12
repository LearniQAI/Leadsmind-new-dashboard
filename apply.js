const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.cwd();
const API_DIR = path.join(ROOT_DIR, 'src', 'app', 'api', 'auth', 'google');
const CALLBACK_DIR = path.join(API_DIR, 'callback');
const LIB_DIR = path.join(ROOT_DIR, 'src', 'lib', 'calendar');

// Create directories safely
[API_DIR, CALLBACK_DIR, LIB_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// File 1: google/route.ts
const routeTs = `import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    if (!workspaceId) return NextResponse.redirect(new URL('/settings?error=NoActiveWorkspace', request.url));

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return NextResponse.redirect(new URL('/settings?error=ConfigurationMissing', request.url));

    const redirectUri = \`\${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback\`;
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
`;
fs.writeFileSync(path.join(API_DIR, 'route.ts'), routeTs);

// File 2: google/callback/route.ts
const callbackTs = `import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) return NextResponse.redirect(new URL('/settings?error=AccessDenied', request.url));
  if (!code) return NextResponse.redirect(new URL('/settings?error=NoCodeProvided', request.url));

  try {
    const redirectUri = \`\${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback\`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) throw new Error('Failed to fetch tokens from Google');
    const tokens = await tokenResponse.json();

    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const { error: dbError } = await supabase
      .from('platform_connections')
      .upsert({
        workspace_id: workspaceId,
        platform: 'google_calendar',
        status: 'connected',
        credentials: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: Date.now() + tokens.expires_in * 1000,
        }
      }, { onConflict: 'workspace_id, platform' });

    if (dbError) throw dbError;

    return NextResponse.redirect(new URL('/settings?success=GoogleCalendarConnected', request.url));
  } catch (err) {
    return NextResponse.redirect(new URL('/settings?error=OAuthFailed', request.url));
  }
}
`;
fs.writeFileSync(path.join(CALLBACK_DIR, 'route.ts'), callbackTs);

// File 3: googleMeet.ts
const meetTs = `import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';

export async function createGoogleMeetLink(appointmentDetails: {
  title: string;
  start_time: string;
  end_time: string;
}): Promise<string | null> {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('credentials')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'google_calendar')
      .single();

    if (!connection || !connection.credentials?.refresh_token) return null;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: connection.credentials.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const tokens = await tokenResponse.json();
    if (!tokens.access_token) throw new Error('Failed to refresh token');

    const eventResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${tokens.access_token}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: appointmentDetails.title,
        start: { dateTime: appointmentDetails.start_time },
        end: { dateTime: appointmentDetails.end_time },
        conferenceData: {
          createRequest: {
            requestId: \`leadsmind-\${Date.now()}\`,
            conferenceSolutionKey: { type: "hangoutsMeet" }
          }
        }
      }),
    });

    const event = await eventResponse.json();
    if (event.conferenceData?.entryPoints) {
      const videoLink = event.conferenceData.entryPoints.find((ep: any) => ep.entryPointType === 'video');
      return videoLink ? videoLink.uri : null;
    }
    return null;
  } catch (err) {
    return null;
  }
}
`;
fs.writeFileSync(path.join(LIB_DIR, 'googleMeet.ts'), meetTs);

// Modify ConnectProviderModal.tsx
const modalPath = path.join(ROOT_DIR, 'src', 'components', 'settings', 'ConnectProviderModal.tsx');
let modalCode = fs.readFileSync(modalPath, 'utf8');
if (!modalCode.includes('window.location.href = "/api/auth/google"')) {
  modalCode = modalCode.replace(
    "if (category === 'email_calendar' || category === 'communication') {",
    "if (category === 'email_calendar' || category === 'communication') {\n      if (provider.toLowerCase().includes('google')) {\n        window.location.href = '/api/auth/google';\n        return;\n      }"
  );
  fs.writeFileSync(modalPath, modalCode);
}

// Modify appointments.ts
const apptPath = path.join(ROOT_DIR, 'src', 'app', 'actions', 'calendar', 'appointments.ts');
let apptCode = fs.readFileSync(apptPath, 'utf8');
if (!apptCode.includes('createGoogleMeetLink')) {
  apptCode = apptCode.replace(
    "const internalLink = \`\${baseUrl}/meet/\${data.id}\`;",
    "const meetLink = await import('@/lib/calendar/googleMeet').then(m => m.createGoogleMeetLink({ title: data.title, start_time: data.start_time, end_time: data.end_time }));\n       const internalLink = meetLink || \`\${baseUrl}/meet/\${data.id}\`;"
  );
  apptCode = apptCode.replace(
    "const internalLink = \`\${baseUrl}/meet/\${data.id}\`;",
    "const meetLink = await import('@/lib/calendar/googleMeet').then(m => m.createGoogleMeetLink({ title: data.title, start_time: data.start_time, end_time: data.end_time }));\n    const internalLink = meetLink || \`\${baseUrl}/meet/\${data.id}\`;"
  );
  fs.writeFileSync(apptPath, apptCode);
}

console.log("SUCCESS! The Google backend code is wired up.");