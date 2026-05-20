/**
 * EmailAutomationService — handles templating, dynamic variable interpolation,
 * and delivery of workflow automated emails via Resend.
 */
import { sendEmail } from '@/lib/email';
import { createAdminClient } from '@/lib/supabase/server';

export interface EmailActionConfig {
  templateType: 'confirmation' | 'notification' | 'recovery' | 'welcome' | 'custom_followup';
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
