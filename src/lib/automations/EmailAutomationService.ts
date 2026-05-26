/**
 * EmailAutomationService — handles templating, dynamic variable interpolation,
 * and delivery of workflow automated emails via Resend.
 */
import { sendEmail } from '@/lib/email';
import { createAdminClient } from '@/lib/supabase/server';

export interface EmailActionConfig {
  templateType: 'confirmation' | 'notification' | 'recovery' | 'welcome' | 'custom_followup' | 'voice_note' | 'voice_note_notification';
  subject: string;
  body: string;
  toEmail?: string;
  fromName?: string;
  fromEmail?: string;
}

export const EmailAutomationService = {
  /**
   * Sends workflow emails with dynamic variable replacement.
   */
  async sendWorkflowEmail(
    workspaceId: string,
    config: EmailActionConfig,
    variables: Record<string, any>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const supabase = createAdminClient();

    // 1. Fetch workspace custom email configs if they exist
    const { data: ws } = await supabase
      .from('workspaces')
      .select('resend_api_key, email_from_name, email_from_address')
      .eq('id', workspaceId)
      .maybeSingle();

    const apiKey = ws?.resend_api_key || process.env.RESEND_API_KEY;
    const fromName = ws?.email_from_name || config.fromName || 'LeadsMind';
    const fromEmail = ws?.email_from_address || config.fromEmail || 'onboarding@resend.dev';

    if (!apiKey) {
      return { success: false, error: 'Email service Resend API Key is missing in workspace config.' };
    }

    // 2. Interpolate dynamic variables
    const recipient = config.toEmail
      ? this.interpolate(config.toEmail, variables)
      : variables.email || variables.Email;

    if (!recipient) {
      return { success: false, error: 'Recipient email address not found in payload.' };
    }

    const subject = this.interpolate(config.subject, variables);
    const bodyText = this.interpolate(config.body, variables);

    // 3. Render HTML using structured navy branding template
    const htmlContent = this.compileHtmlTemplate(config.templateType, subject, bodyText, variables);

    // 4. Dispatch email with retry safety
    let attempts = 0;
    const maxAttempts = 3;
    let lastError = '';

    while (attempts < maxAttempts) {
      try {
        attempts++;
        const res = await sendEmail({
          to: recipient.trim(),
          subject,
          html: htmlContent,
          config: {
            apiKey,
            fromEmail,
            fromName,
          },
        });
        return { success: true, data: res };
      } catch (err: any) {
        lastError = err.message || 'Delivery error';
        if (attempts < maxAttempts) {
          // Linear backoff delay
          await new Promise(r => setTimeout(r, attempts * 1000));
        }
      }
    }

    return { success: false, error: `Email delivery failed after ${maxAttempts} attempts. Error: ${lastError}` };
  },

  /**
   * Replaces double curly braces {{variable}} with payload values.
   */
  interpolate(template: string, variables: Record<string, any>): string {
    if (!template) return '';
    return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, key) => {
      // Direct variable access
      if (variables[key] !== undefined) {
        return String(variables[key]);
      }
      
      // Fallback for case-insensitive checks
      const foundKey = Object.keys(variables).find(k => k.toLowerCase() === key.toLowerCase());
      if (foundKey !== undefined && variables[foundKey] !== undefined) {
        return String(variables[foundKey]);
      }

      return '';
    });
  },

  /**
   * Compiles templates using LeadsMind Design System styles.
   */
  compileHtmlTemplate(
    type: string,
    subject: string,
    body: string,
    variables: Record<string, any>
  ): string {
    if (type === 'voice_note' || type === 'voice_note_notification') {
      const senderFullName = variables.sender_full_name || variables.full_name || 'Team Member';
      const senderPhotoUrl = variables.sender_photo_url || variables.profile_photo_url || 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/images/portrait-placeholder.png';
      const senderJobTitle = variables.sender_job_title || variables.job_title || 'AI Developer';
      const workspaceName = variables.workspace_name || 'LeadsMind Workspace';
      const workspaceLogoUrl = variables.workspace_logo_url || 'https://leadsmind.io/logo-white.png';
      const audioHostedUrl = variables.audio_hosted_url || variables.audio_url || variables.source_url || '';
      const waveformImageUrl = variables.waveform_image_url || '';
      const transcript = variables.transcript || variables.original_text || '';
      const contactFirstName = variables.contact_first_name || variables.first_name || 'there';
      const voiceNoteCaption = variables.voice_note_caption || variables.caption || '';
      const durationFormatted = variables.duration_formatted || '0:30';

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px 0;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td align="center">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                  
                  <!-- Header Band (Full bleed brand color strip with Vertical 16px / Horizontal 24px padding) -->
                  <tr>
                    <td style="background-color: #5C4AC7; padding: 16px 24px; text-align: center; vertical-align: middle;">
                      <img src="${workspaceLogoUrl}" alt="Workspace Logo" height="28" style="border: 0; outline: none; display: block; margin: 0 auto; max-height: 28px;" />
                    </td>
                  </tr>

                  <!-- Content Area -->
                  <tr>
                    <td style="padding: 24px;">
                      
                      <!-- Subject -->
                      <h2 style="font-size: 18px; font-weight: bold; color: #1e293b; margin: 0 0 16px 0;">${subject}</h2>

                      <!-- Identity Row (56x56px rounded user portrait block with 14px right margin gap) -->
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 24px 0;">
                        <tr>
                          <td width="56" valign="top" style="padding-right: 14px;">
                            <img src="${senderPhotoUrl}" alt="${senderFullName}" width="56" height="56" style="border: 0; outline: none; display: block; border-radius: 28px; width: 56px; height: 56px; object-fit: cover;" />
                          </td>
                          <td valign="middle">
                            <div style="font-size: 17px; font-weight: bold; color: #1A1A1A; line-height: 1.2;">${senderFullName}</div>
                            <div style="font-size: 13px; color: #888888; margin-top: 3px;">${senderJobTitle} · ${workspaceName}</div>
                          </td>
                        </tr>
                      </table>

                      <!-- Personalized Introductory Copy -->
                      <p style="font-size: 14px; line-height: 1.6; color: #2D2D2D; margin: 0 0 12px 0;">
                        Hi ${contactFirstName},
                      </p>

                      <!-- Caption Text -->
                      ${body ? `<p style="font-size: 14px; line-height: 1.6; color: #2D2D2D; margin: 0 0 20px 0;">${body.replace(/\n/g, '<br>')}</p>` : ''}

                      <!-- Optional Context Caption Quote Block -->
                      ${voiceNoteCaption ? `
                      <p style="font-size: 14px; line-height: 1.6; color: #555555; font-style: italic; margin: 0 0 20px 0;">
                        "${voiceNoteCaption}"
                      </p>
                      ` : ''}

                      <!-- Audio Block (Soft warm gray background container #F1EFE8 with 12px rounded borders & 4px left highlight brand color line) -->
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F1EFE8; border-left: 4px solid #5C4AC7; border-radius: 12px; margin: 0 0 24px 0;">
                        <tr>
                          <td style="padding: 20px;">
                            <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #5C4AC7; margin-bottom: 12px; letter-spacing: 0.05em;">Voice Note Attachment</div>
                            
                            <!-- Static PNG Waveform Fallback Image -->
                            ${waveformImageUrl ? `
                            <div style="margin-bottom: 16px; text-align: center;">
                              <img src="${waveformImageUrl}" alt="Waveform" width="100%" style="border: 0; outline: none; max-width: 500px; display: inline-block; border-radius: 8px;" />
                            </div>
                            ` : ''}

                            <!-- Play Integration Trigger (Centered 48x48px circular play action element) -->
                            <div style="margin: 20px 0; text-align: center;">
                              <a href="${audioHostedUrl}" target="_blank" style="display: inline-block; width: 48px; height: 48px; line-height: 48px; background-color: #5C4AC7; border-radius: 24px; text-align: center; text-decoration: none; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
                                <span style="color: #ffffff; font-size: 18px; margin-left: 4px; display: inline-block; vertical-align: middle; line-height: 48px;">▶</span>
                              </a>
                            </div>

                            <!-- Control Subtext Block (Duration and instructions) -->
                            <div style="font-size: 12px; color: #888888; text-align: center; margin-bottom: 16px; font-family: Arial, sans-serif;">
                              Duration: ${durationFormatted} · Tap to play in your browser
                            </div>

                            <!-- HTML5 Audio Fallback Control -->
                            <div style="margin-bottom: 16px;">
                              <audio controls style="width: 100%; border-radius: 8px;">
                                <source src="${audioHostedUrl}" type="audio/mpeg" />
                                <source src="${audioHostedUrl}" type="audio/webm" />
                                Your browser does not support audio playback inline.
                              </audio>
                            </div>

                            <!-- Download Actions Link -->
                            <div style="text-align: left;">
                              <a href="${audioHostedUrl}" download style="font-size: 13px; color: #5C4AC7; font-weight: bold; text-decoration: none; display: inline-block;">
                                ⬇ Download MP3 to listen offline
                              </a>
                            </div>
                          </td>
                        </tr>
                      </table>

                      <!-- Expandable Transcript Module -->
                      ${transcript ? `
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 20px 0;">
                        <tr>
                          <td>
                            <details style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #FAFAFE; outline: none;">
                              <summary style="padding: 16px; font-size: 13px; font-weight: bold; color: #5C4AC7; cursor: pointer; user-select: none; outline: none;">
                                ✨ View AI Audio Transcript
                              </summary>
                              <div style="padding: 16px; border-top: 1px solid #e2e8f0; font-size: 13.5px; line-height: 1.6; color: #475569; font-style: italic; background-color: #FAFAFE;">
                                "${transcript}"
                              </div>
                            </details>
                          </td>
                        </tr>
                      </table>
                      ` : ''}

                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.5;">
                      Sent automatically by LeadsMind Voice Engine. Keep capturing premium high-intent leads.<br>
                      © ${new Date().getFullYear()} LeadsMind Inc. All rights reserved.
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;
    }

    const actionButton = this.renderActionButton(type, variables);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'DM Sans', Arial, sans-serif; background-color: #04081a; color: #eef2ff; margin: 0; padding: 40px 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: rgba(12, 21, 53, 0.95); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 24px; padding: 40px; box-sizing: border-box; }
          h1 { font-family: 'Space Grotesk', Arial, sans-serif; font-size: 20px; text-transform: uppercase; color: #2563eb; letter-spacing: 0.05em; margin-top: 0; margin-bottom: 24px; font-weight: 900; }
          p { font-size: 14px; line-height: 1.6; color: #94a3c8; margin-top: 0; margin-bottom: 20px; }
          .footer { font-size: 11px; color: #4a5a82; line-height: 1.5; margin-top: 40px; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${subject}</h1>
          <p>${body.replace(/\n/g, '<br>')}</p>
          ${actionButton}
          <div class="footer">
            Sent automatically by LeadsMind Forms. Keep capturing premium high-intent leads.<br>
            © ${new Date().getFullYear()} LeadsMind Inc. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;
  },

  /**
   * Helper: Render templates actions triggers
   */
  renderActionButton(type: string, variables: Record<string, any>): string {
    if (type === 'recovery' && variables.recovery_link) {
      return `
        <div style="margin: 32px 0; text-align: center;">
          <a href="${variables.recovery_link}" style="background-color: #2563eb; color: #ffffff; padding: 12px 32px; border-radius: 12px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Space Grotesk', sans-serif;">Resume Form Progress</a>
        </div>
      `;
    }
    return '';
  }
};
