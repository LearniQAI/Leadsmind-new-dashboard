import { sendEmail } from '@/lib/email';
import { getWorkspaceEmailConfig } from '@/lib/email/resolveConfig';
import { createAdminClient } from '@/lib/supabase/server';

interface SenderInfo {
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  job_title?: string | null;
  identity_color?: string | null;
  profile_photo_url?: string | null;
  avatar_preset_id?: string | null;
}

interface SendVoiceNoteEmailProps {
  workspaceId: string;
  toEmail: string;
  sender: SenderInfo;
  audioUrl: string;
  audioDuration?: number;
  message?: string;
}

export async function sendVoiceNoteEmail({
  workspaceId,
  toEmail,
  sender,
  audioUrl,
  audioDuration,
  message
}: SendVoiceNoteEmailProps) {
  const supabase = createAdminClient();

  // Fetch workspace and branding info
  const { data: ws } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .maybeSingle();

  const { data: branding } = await supabase
    .from('workspace_branding')
    .select('logo_url, primary_color')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  const workspaceName = ws?.name || 'LeadsMind';
  const brandColor = branding?.primary_color || '#5C4AC7';
  const logoUrl = branding?.logo_url || 'https://www.leadsmind.io/logo-white.png';

  // Format sender identity details
  const firstName = sender?.first_name || '';
  const lastName = sender?.last_name || '';
  const fullName = sender?.full_name || (firstName || lastName ? `${firstName} ${lastName}`.trim() : null) || 'Team Member';
  
  const initials = firstName && lastName 
    ? `${firstName[0]}${lastName[0]}` 
    : fullName.split(' ').map(n => n[0]).join('').slice(0, 2) || 'LM';

  const avatarBg = sender?.identity_color || brandColor;

  const durationStr = audioDuration 
    ? `Duration: ${Math.floor(audioDuration / 60)}m ${Math.floor(audioDuration % 60)}s` 
    : '';

  // Render initials avatar as SVG or styled CSS fallback
  const avatarHtml = sender?.profile_photo_url
    ? `<img src="${sender.profile_photo_url}" alt="${fullName}" width="48" height="48" style="border-radius: 50%; object-fit: cover; display: block;" />`
    : `<div style="width: 48px; height: 48px; border-radius: 50%; background-color: ${avatarBg}1A; border: 2px solid ${avatarBg}44; color: ${avatarBg}; text-align: center; line-height: 44px; font-weight: bold; font-family: Arial, sans-serif; font-size: 16px; box-sizing: border-box; display: inline-block;">${initials.toUpperCase()}</div>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Voice Note from ${fullName}</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f6fa; margin: 0; padding: 40px 20px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 500px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
              
              <!-- Brand Header -->
              <tr>
                <td style="background-color: ${brandColor}; padding: 24px; text-align: center;">
                  <img src="${logoUrl}" alt="${workspaceName} Logo" height="32" style="max-height: 32px; border: 0; outline: none;" />
                </td>
              </tr>

              <!-- Main Content -->
              <tr>
                <td style="padding: 32px 24px;">
                  
                  <!-- Sender Identity -->
                  <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                    <tr>
                      <td width="48" style="padding-right: 12px; vertical-align: middle;">
                        ${avatarHtml}
                      </td>
                      <td style="vertical-align: middle; text-align: left;">
                        <div style="font-size: 16px; font-weight: bold; color: #1e293b;">${fullName}</div>
                        ${sender.job_title ? `<div style="font-size: 13px; color: #64748b; margin-top: 2px;">${sender.job_title}</div>` : ''}
                      </td>
                    </tr>
                  </table>

                  <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 24px 0;">
                    Hello,<br><br>
                    You have received a voice note from ${fullName}. Click the button below to listen to the audio recording.
                  </p>

                  <!-- CTA Button -->
                  <div style="text-align: center; margin-bottom: 24px;">
                    <a href="${audioUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: ${brandColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      ▶ Listen to voice note
                    </a>
                    ${durationStr ? `<div style="font-size: 12px; color: #64748b; margin-top: 8px;">${durationStr}</div>` : ''}
                  </div>

                  ${message ? `
                  <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
                    <p style="font-size: 14px; color: #475569; font-style: italic; line-height: 1.5; margin: 0;">
                      "${message}"
                    </p>
                  </div>
                  ` : ''}

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3c8;">
                  Sent automatically via ${workspaceName}.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const config = await getWorkspaceEmailConfig(workspaceId);

  return sendEmail({
    to: toEmail,
    subject: `Voice note from ${fullName}`,
    html: htmlContent,
    config: config || undefined
  });
}
