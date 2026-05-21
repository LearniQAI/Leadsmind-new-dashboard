export function InviteEmailHTML({
  inviterEmail,
  formName,
  role,
  acceptLink,
  isReminder = false,
}: {
  inviterEmail: string
  formName: string
  role: string
  acceptLink: string
  isReminder?: boolean
}): string {
  const subject = isReminder
    ? `Reminder: You're invited to collaborate on "${formName}"`
    : `You've been invited to collaborate on "${formName}"`;

  const heading = isReminder ? 'Reminder:' : 'Collaboration';
  const headingAccent = isReminder ? 'Invite Reminder' : 'Invite';
  const roleDescription = role === 'editor'
    ? 'Full edit access to form fields, settings, and submissions.'
    : 'Read-only view of form data and submissions.';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#04091a;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#04091a;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#04091a;border-radius:20px;border:1px solid rgba(37,99,235,0.3);overflow:hidden;">
          <tr>
            <td style="padding:40px 36px 24px;background:linear-gradient(180deg,#0c1535 0%,#04091a 100%);">
              <h1 style="font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;margin:0 0 4px;color:#eef2ff;">
                ${heading} <span style="color:#3b82f6;">${headingAccent}</span>
              </h1>
              <p style="color:#4a5a82;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 28px;">LeadsMind Form Access</p>
              <p style="color:#94a3c8;font-size:14px;line-height:1.6;margin:0 0 20px;">
                <strong style="color:#eef2ff;">${inviterEmail}</strong> has invited you to collaborate on <strong style="color:#3b82f6;">"${formName}"</strong>.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 4px;font-size:10px;color:#4a5a82;text-transform:uppercase;letter-spacing:1.5px;">Your Role</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#3b82f6;font-family:'Space Grotesk',sans-serif;">${role.toUpperCase()}</p>
                    <p style="margin:8px 0 0;font-size:12px;color:#4a5a82;">${roleDescription}</p>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:12px;background:#2563eb;">
                    <a href="${acceptLink}" style="display:inline-block;padding:16px 48px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:1px;font-family:'Space Grotesk',sans-serif;">Accept Invitation</a>
                  </td>
                </tr>
              </table>
              <p style="color:#4a5a82;font-size:11px;margin-top:16px;">This invitation expires in 7 days.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 36px;border-top:1px solid rgba(255,255,255,0.05);background:#080f28;">
              <p style="margin:0;color:#2a3557;font-size:10px;text-align:center;">LeadsMind — Smart Form Builder</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
