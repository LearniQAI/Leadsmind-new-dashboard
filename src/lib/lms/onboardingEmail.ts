import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { getWorkspaceEmailConfig } from '@/lib/email/resolveConfig';
import { logger } from '@/shared/logger';

const DEFAULT_SUBJECT = 'Welcome to {{course_name}}!';
const DEFAULT_BODY = `Hello {{student_first_name}},

Welcome to {{course_name}}! You have been granted {{access_type_description}} access.

Access your student portal here: {{portal_url}}

If you have any questions, contact us at {{admin_support_email}}.`;

// Appended (outside the admin-authored template) only for guest enrollments, so a visitor who
// checked out without an account gets a real way to sign in and track progress. Kept separate
// from DEFAULT_BODY so existing custom templates don't need editing to include it.
const ACCOUNT_SETUP_BLOCK = `

--
Set up your account to log back in any time and track your progress:
{{account_setup_url}}`;

const ACCESS_DESCRIPTIONS: Record<string, string> = {
  full: 'full',
  preview: 'preview',
  trial: 'trial',
};

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Minimal renderer for the admin-authored template: {{var}} substitution + light markdown. */
function render(template: string, vars: Record<string, string>) {
  const filled = template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, key) =>
    key in vars ? vars[key] : `{{${key}}}`
  );

  const text = filled.replace(/\*\*(.+?)\*\*/g, '$1');

  const htmlBody = escapeHtml(filled)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" style="color:#0284c7;text-decoration:underline;">$1</a>'
    )
    .replace(/\n/g, '<br/>');

  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:28px 32px;color:#0f172a;font-size:14px;line-height:1.7;">${htmlBody}</td></tr>
      <tr><td style="padding:16px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:12px;">
        Sent by ${escapeHtml(vars.course_name)} · LeadsMind
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  return { text, html };
}

/**
 * Sends the course's onboarding/invitation email to a newly-enrolled student.
 *
 * Uses the admin-authored template in courses.onboarding_email_subject/body (falling back
 * to a sensible default), interpolates the {{variables}} shown in the Emails settings tab,
 * and delivers via the workspace's own Resend config (or the platform default).
 *
 * Fail-soft by design: enrollment must never be blocked by an email problem, so every
 * failure is logged and swallowed. Returns whether an email actually went out.
 */
export async function sendCourseOnboardingEmail(opts: {
  courseId: string;
  contactId: string;
  workspaceId: string;
  accessType?: string | null;
  /** When set (guest enrollment), an account-setup / magic login link is appended to the email. */
  accountSetupUrl?: string | null;
}): Promise<{ sent: boolean; reason?: string }> {
  const { courseId, contactId, workspaceId, accessType, accountSetupUrl } = opts;
  try {
    const admin = createAdminClient();

    const [{ data: course }, { data: contact }, { data: workspace }] = await Promise.all([
      admin
        .from('courses')
        .select('title, onboarding_email_subject, onboarding_email_body')
        .eq('id', courseId)
        .maybeSingle(),
      admin.from('contacts').select('email, first_name').eq('id', contactId).maybeSingle(),
      admin.from('workspaces').select('name').eq('id', workspaceId).maybeSingle(),
    ]);

    if (!course) return { sent: false, reason: 'course_not_found' };
    if (!contact?.email) return { sent: false, reason: 'contact_has_no_email' };

    const emailConfig = await getWorkspaceEmailConfig(workspaceId);

    const vars: Record<string, string> = {
      student_first_name: contact.first_name || 'there',
      student_email: contact.email,
      course_name: course.title || 'your course',
      portal_url: `${appUrl()}/student/courses/${courseId}`,
      access_type_description:
        ACCESS_DESCRIPTIONS[(accessType || 'full') as string] || accessType || 'full',
      admin_support_email:
        emailConfig?.fromEmail ||
        process.env.RESEND_FROM_EMAIL ||
        'support@leadsmind.io',
      account_setup_url: accountSetupUrl || `${appUrl()}/auth/student/login`,
    };

    let bodyTemplate = course.onboarding_email_body || DEFAULT_BODY;
    // Guest enrollment: append the account-setup CTA unless the workspace's custom template
    // already references it explicitly.
    if (accountSetupUrl && !bodyTemplate.includes('{{account_setup_url}}')) {
      bodyTemplate += ACCOUNT_SETUP_BLOCK;
    }

    const subject = render(course.onboarding_email_subject || DEFAULT_SUBJECT, vars).text;
    const { text, html } = render(bodyTemplate, vars);

    await sendEmail({
      to: contact.email,
      subject,
      html,
      text,
      config: emailConfig
        ? {
            apiKey: emailConfig.apiKey,
            fromEmail: emailConfig.fromEmail,
            fromName: emailConfig.fromName || (workspace as any)?.name || 'LeadsMind',
          }
        : undefined,
    });

    logger.info({ courseId, contactId, workspaceId }, 'lms.onboarding_email.sent');
    return { sent: true };
  } catch (err: any) {
    logger.error(
      { err, courseId, contactId, workspaceId },
      'lms.onboarding_email.send_failed'
    );
    return { sent: false, reason: err?.message || 'send_failed' };
  }
}
