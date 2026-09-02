import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { getWorkspaceEmailConfig } from '@/lib/email/resolveConfig';
import { logger } from '@/shared/logger';

/**
 * Batch 4 (G7) — the "certificate earned" notification email.
 *
 * A REAL, DEDICATED template — not the generic `send_email` automation action (which passes
 * `action_config.email_body` straight through with no {{variable}} interpolation; reusing it
 * here would either ship literal "{{student_first_name}}" text or require fixing that
 * unrelated pre-existing gap as a side effect of this batch). This mirrors the one other real
 * templated LMS email in the codebase, `sendCourseOnboardingEmail` (same Resend
 * infra/getWorkspaceEmailConfig/fail-soft shape), with its own fixed, congratulatory copy.
 *
 * Delivery is a REAL LINK to the existing authenticated download route
 * (`/api/student/courses/[id]/certificate`), not a PDF attachment. Deliberate: generating the
 * attachment would mean running the puppeteer/@sparticuz/chromium PDF render a SECOND time
 * inside the automation event-bus's call stack (which also runs synchronously inside a chain
 * of other rule executions) — a heavy, latency-sensitive operation with no real benefit over a
 * link, since the download route is already the single canonical PDF-generation path
 * (see issueCertificate.ts) and always regenerates the identical PDF from the same persisted
 * `course_certificates` row. A student who isn't logged in when they click it hits the normal
 * sign-in flow, same as any other portal link in this project's emails.
 *
 * Fail-soft by design, matching every other LMS email: the certificate record already exists
 * and is fully valid/downloadable regardless of whether this call succeeds. Every failure is
 * logged and swallowed — never thrown back into the automation chain.
 */
export async function sendCertificateEarnedEmail(opts: {
  courseId: string;
  contactId: string;
  workspaceId: string;
  validationId: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const { courseId, contactId, workspaceId, validationId } = opts;
  try {
    const admin = createAdminClient();

    const [{ data: course }, { data: contact }, { data: workspace }] = await Promise.all([
      admin.from('courses').select('title').eq('id', courseId).maybeSingle(),
      admin.from('contacts').select('email, first_name').eq('id', contactId).maybeSingle(),
      admin.from('workspaces').select('name').eq('id', workspaceId).maybeSingle(),
    ]);

    if (!course) return { sent: false, reason: 'course_not_found' };
    if (!contact?.email) return { sent: false, reason: 'contact_has_no_email' };

    const emailConfig = await getWorkspaceEmailConfig(workspaceId);

    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000'
    ).replace(/\/$/, '');

    const studentFirstName = contact.first_name || 'there';
    const courseName = course.title || 'your course';
    const downloadUrl = `${appUrl}/api/student/courses/${courseId}/certificate`;
    const verifyUrl = `${appUrl}/certificates/verify/${encodeURIComponent(validationId)}`;
    const brandName = workspace?.name || 'LeadsMind';

    const subject = `You earned your certificate for ${courseName}! 🎓`;

    const text = `Congratulations, ${studentFirstName}!

You've completed every lesson and passed every quiz in "${courseName}" — that's a real
achievement. Your completion certificate is ready.

Download your certificate: ${downloadUrl}
Verify it any time: ${verifyUrl}

Well done, and see you in the next course.
— ${brandName}`;

    const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:32px 32px 8px;text-align:center;">
        <div style="font-size:40px;line-height:1;">🎓</div>
      </td></tr>
      <tr><td style="padding:8px 32px 0;text-align:center;">
        <h1 style="margin:0;font-size:20px;color:#0f172a;">Congratulations, ${escapeHtml(studentFirstName)}!</h1>
      </td></tr>
      <tr><td style="padding:12px 32px 0;color:#334155;font-size:14px;line-height:1.7;text-align:center;">
        You've completed every lesson and passed every quiz in <strong>${escapeHtml(courseName)}</strong> — that's a real achievement. Your completion certificate is ready.
      </td></tr>
      <tr><td style="padding:24px 32px;text-align:center;">
        <a href="${downloadUrl}" style="display:inline-block;background:#0284c7;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:10px;">Download my certificate</a>
      </td></tr>
      <tr><td style="padding:0 32px 28px;text-align:center;color:#64748b;font-size:12px;">
        Verify it any time at <a href="${verifyUrl}" style="color:#0284c7;">${verifyUrl}</a>
      </td></tr>
      <tr><td style="padding:16px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:12px;text-align:center;">
        Sent by ${escapeHtml(brandName)} · LeadsMind
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

    await sendEmail({
      to: contact.email,
      subject,
      html,
      text,
      config: emailConfig
        ? {
            apiKey: emailConfig.apiKey,
            fromEmail: emailConfig.fromEmail,
            fromName: emailConfig.fromName || brandName,
          }
        : undefined,
    });

    logger.info({ courseId, contactId, workspaceId, validationId }, 'lms.certificate_email.sent');
    return { sent: true };
  } catch (err: any) {
    logger.error(
      { err, courseId, contactId, workspaceId, validationId },
      'lms.certificate_email.send_failed',
    );
    return { sent: false, reason: err?.message || 'send_failed' };
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
