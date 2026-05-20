// RecoveryManager — handles generating recovery links and triggering recovery emails
import { sendEmail } from '@/lib/email';

export const RecoveryManager = {
  /**
   * Generates a secure recovery link for a form submission session
   */
  generateRecoveryLink(formId: string, token: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${origin}/public/forms/${formId}?lm_recovery_token=${token}`;
  },

  /**
   * Sends the recovery email to the user with their recovery link
   */
  async sendRecoveryEmail(
    toEmail: string,
    formName: string,
    recoveryLink: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const subject = `Continue your progress on ${formName}`;
      
      const htmlContent = `
        <div style="font-family: 'DM Sans', sans-serif; background-color: #0c1535; color: #ffffff; padding: 40px; border-radius: 24px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255, 255, 255, 0.07);">
          <h1 style="font-family: 'Space Grotesk', sans-serif; font-size: 24px; text-transform: uppercase; margin-bottom: 20px; color: #2563eb;">LeadsMind Forms Recovery</h1>
          <p style="font-size: 14px; line-height: 1.6; color: #94a3c8;">
            We noticed you didn't finish filling out the <strong>${formName}</strong> form. You can resume right where you left off by clicking the button below.
          </p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${recoveryLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 30px; border-radius: 12px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Space Grotesk', sans-serif;">Resume Session</a>
          </div>
          <p style="font-size: 11px; color: #4a5a82; line-height: 1.5; margin-top: 30px;">
            This link is secure and will expire in 7 days. If you didn't request this email, you can safely ignore it.
          </p>
        </div>
      `;

      await sendEmail({
        to: toEmail,
        subject,
        html: htmlContent
      });

      return { success: true };
    } catch (err: any) {
      console.error('[RecoveryManager] Send recovery email error:', err);
      return { success: false, error: err?.message || 'Email delivery failed' };
    }
  }
};
