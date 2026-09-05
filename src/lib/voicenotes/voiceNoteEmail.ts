import crypto from 'crypto';
import { sendEmail } from '@/lib/email';
import { getWorkspaceEmailConfig } from '@/lib/email/resolveConfig';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';

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
  /** The real messages.id this email is sent for — required to persist the
   *  hosted-playback token and to attribute waveform clicks back to this
   *  message (Email Channel Part 3). */
  messageId: string;
  toEmail: string;
  sender: SenderInfo;
  audioUrl: string;
  audioDuration?: number;
  /** The real, agent-reviewed transcript (Email Channel Part 2) — rendered as
   *  genuine body text, not an italic caption. */
  message?: string;
  /** Reply-To for this workspace's inbound receiving address (Email Channel
   *  Part 1) — without it, a recipient reply goes to the generic send-from
   *  address instead of back into this workspace's inbox. */
  replyTo?: string;
  /** Real agent-typed subject (Compose gap fix). Falls back to the original
   *  "Voice note from {sender}" default when not provided (e.g. a voice-note
   *  reply in an existing thread). */
  subject?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Static waveform proportions — matches VoiceNotePlayer.tsx's real
// WAVEFORM_BARS visual language (the established "this is a voice note"
// language elsewhere in this product), reduced to 24 bars to match the
// reference Outlook_Email_Mockup.html's bar count for an email-width layout.
const EMAIL_WAVEFORM_HEIGHTS = [
  10, 18, 8, 24, 14, 20, 9, 22, 12, 26, 15, 19,
  8, 23, 11, 17, 9, 21, 13, 16, 10, 24, 14, 8,
];

// A table of solid-colour <td> cells, NOT an <img> — renders identically with
// images blocked (the PRD's own requirement) because there is no image to
// block, and Outlook's Word HTML engine reliably supports plain background-
// coloured table cells (unlike gradients, box-shadow, or flexbox). Diverges
// deliberately from the PRD's literal "PNG/SVG-flattened-to-PNG" wording —
// the reference mockup itself uses CSS/table bars, not a flattened image, and
// building a real per-message server-rendered PNG pipeline is materially
// larger scope not justified here.
function renderWaveformBlock(params: { href: string; caption: string; durationLabel: string; brandColor: string }): string {
  const { href, caption, durationLabel, brandColor } = params;
  const bars = EMAIL_WAVEFORM_HEIGHTS
    .map(
      (h) =>
        `<td width="4" style="padding:0 1px;"><div style="width:3px;height:${h}px;background-color:${brandColor};border-radius:2px;"></div></td>`
    )
    .join('');

  return `
    <a href="${href}" target="_blank" style="text-decoration:none;display:block;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFF9EC;border:1px solid #E3D9B8;border-radius:10px;margin:16px 0;">
        <tr>
          <td style="padding:14px 16px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="42" valign="middle">
                  <table cellpadding="0" cellspacing="0" border="0" width="42" height="42" style="background-color:${brandColor};border-radius:21px;">
                    <tr><td align="center" valign="middle" style="color:#ffffff;font-size:14px;line-height:1;">&#9654;</td></tr>
                  </table>
                </td>
                <td style="padding-left:12px;" valign="middle">
                  <div style="font-size:12.5px;font-weight:600;color:#7A5B00;margin-bottom:6px;">${escapeHtml(caption)}</div>
                  <table cellpadding="0" cellspacing="0" border="0"><tr>${bars}</tr></table>
                </td>
                <td width="46" align="right" valign="middle" style="font-size:12.5px;font-weight:600;color:#7A5B00;white-space:nowrap;">
                  ${escapeHtml(durationLabel)}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </a>
  `;
}

export async function sendVoiceNoteEmail({
  workspaceId,
  messageId,
  toEmail,
  sender,
  audioUrl,
  audioDuration,
  message,
  replyTo,
  subject
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

  const durationLabel = audioDuration
    ? `${Math.floor(audioDuration / 60)}:${String(Math.floor(audioDuration % 60)).padStart(2, '0')}`
    : '';

  // Render initials avatar as SVG or styled CSS fallback
  const avatarHtml = sender?.profile_photo_url
    ? `<img src="${sender.profile_photo_url}" alt="${fullName}" width="48" height="48" style="border-radius: 50%; object-fit: cover; display: block;" />`
    : `<div style="width: 48px; height: 48px; border-radius: 50%; background-color: ${avatarBg}1A; border: 2px solid ${avatarBg}44; color: ${avatarBg}; text-align: center; line-height: 44px; font-weight: bold; font-family: Arial, sans-serif; font-size: 16px; box-sizing: border-box; display: inline-block;">${initials.toUpperCase()}</div>`;

  // --- Hosted playback page (PRD 4.5) --------------------------------------
  // A fresh opaque token per send (never the message's own id — see the
  // migration's comment), persisted against the real message record. Merge,
  // not overwrite, onto whatever metadata sendMessage() already wrote
  // (client_message_uuid, transcript, etc.).
  const playbackToken = crypto.randomUUID();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.leadsmind.io';

  try {
    const { data: existing } = await supabase.from('messages').select('metadata').eq('id', messageId).maybeSingle();
    await supabase
      .from('messages')
      .update({
        voice_playback_token: playbackToken,
        metadata: {
          ...(existing?.metadata || {}),
          voice_playback_snapshot: { sender_name: fullName, workspace_name: workspaceName, brand_color: brandColor },
        },
      })
      .eq('id', messageId);
  } catch (tokenErr) {
    logger.error({ err: tokenErr, messageId }, 'voice_note_email.playback_token.persist_failed');
  }

  const playbackUrlTop = `${appUrl}/voice-note/${playbackToken}?pos=top`;
  const playbackUrlBottom = `${appUrl}/voice-note/${playbackToken}?pos=bottom`;

  const transcriptHtml = message
    ? `<p style="font-size: 15px; color: #334155; line-height: 1.65; margin: 0 0 4px 0; white-space: pre-wrap;">${escapeHtml(message).replace(/\n/g, '<br>')}</p>`
    : `<p style="font-size: 15px; color: #334155; line-height: 1.65; margin: 0 0 4px 0;">${fullName} sent you a voice message.</p>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Voice note from ${fullName}</title>
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
                  <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
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

                  <!-- Waveform (top) -->
                  ${renderWaveformBlock({
                    href: playbackUrlTop,
                    caption: `Prefer to listen? Tap to play${durationLabel ? ` — ${durationLabel}` : ''}`,
                    durationLabel,
                    brandColor,
                  })}

                  <!-- Transcript body — the full message, always readable even
                       if the recipient never clicks (PRD 4.4/5.1). -->
                  ${transcriptHtml}

                  <!-- Waveform (bottom) — repeated for a recipient who skimmed
                       straight to the end (PRD 4.4). -->
                  ${renderWaveformBlock({
                    href: playbackUrlBottom,
                    caption: "Didn't catch it above? Play the voice message here",
                    durationLabel,
                    brandColor,
                  })}

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
  const mergedConfig = {
    ...(config || {}),
    ...(replyTo ? { headers: { ...(config as any)?.headers, 'Reply-To': replyTo } } : {}),
  };

  return sendEmail({
    to: toEmail,
    subject: subject?.trim() || `Voice note from ${fullName}`,
    html: htmlContent,
    config: Object.keys(mergedConfig).length > 0 ? mergedConfig : undefined
  });
}
