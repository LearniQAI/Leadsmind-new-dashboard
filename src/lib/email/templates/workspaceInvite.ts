// Platform transactional email for a workspace team invitation (Settings → Team → Invite).
//
// Always LeadsMind-branded, never the inviting workspace's white-label branding: this is the
// platform's own mail, sent from the platform sender, so logo and colours are fixed constants
// here and nothing reads BrandingProvider / workspace colour settings. Only the copy varies
// (workspace name, inviter, role). Every dynamic value is HTML-escaped — workspace and user
// names are user-controlled, and unescaped they could inject markup/links into LeadsMind mail.
//
// Layout follows the existing transactional emails (src/lib/lms/onboardingEmail.ts): light
// #f1f5f9 page, 560px white table card, #e2e8f0 border, system font stack, inline CSS only.

const BRAND_BLUE = '#1359FF'; // tailwind `primary` — LeadsMind Royal Blue
const TEXT = '#0F172A';
const MUTED = '#475569';
const SUBTLE = '#64748B';
const BORDER = '#E2E8F0';

// Platform asset on the production origin (not NEXT_PUBLIC_APP_URL): the logo must resolve
// for every recipient even when the invite is sent from a dev/preview environment.
const LOGO_URL = 'https://www.leadsmind.io/assets/images/brand/LeadsMind_Logo.png.png';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
  client: 'Client',
  hr: 'HR',
  payroll: 'Payroll',
  compliance: 'Compliance',
};

export function inviteRoleLabel(role: string): string {
  return ROLE_LABELS[role] || role.charAt(0).toUpperCase() + role.slice(1);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface WorkspaceInviteEmailInput {
  workspaceName: string;
  /** Display name of the admin who sent the invite; falls back to generic copy when unknown. */
  inviterName?: string | null;
  role: string;
  acceptUrl: string;
  expiresInDays?: number;
}

export function renderWorkspaceInviteEmail(input: WorkspaceInviteEmailInput) {
  const workspaceName = input.workspaceName.trim() || 'a LeadsMind workspace';
  const inviterName = input.inviterName?.trim() || null;
  const roleLabel = inviteRoleLabel(input.role);
  const days = input.expiresInDays ?? 7;

  const subject = inviterName
    ? `${inviterName} invited you to join ${workspaceName} on LeadsMind`
    : `You've been invited to join ${workspaceName} on LeadsMind`;

  const intro = inviterName
    ? `${inviterName} has invited you to join ${workspaceName} on LeadsMind with the ${roleLabel} role.`
    : `You've been invited to join ${workspaceName} on LeadsMind with the ${roleLabel} role.`;

  const text = [
    `You've been invited to join ${workspaceName}`,
    '',
    intro,
    '',
    'Accept the invitation here:',
    input.acceptUrl,
    '',
    `This invitation expires in ${days} days. If you weren't expecting it, you can ignore this email.`,
    '',
    '— LeadsMind',
  ].join('\n');

  const e = escapeHtml;
  const url = e(input.acceptUrl);
  const introHtml = inviterName
    ? `<strong style="color:${TEXT};">${e(inviterName)}</strong> has invited you to join <strong style="color:${TEXT};">${e(workspaceName)}</strong> on LeadsMind with the ${e(roleLabel)} role.`
    : `You've been invited to join <strong style="color:${TEXT};">${e(workspaceName)}</strong> on LeadsMind with the ${e(roleLabel)} role.`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${e(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${e(intro)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;">
      <tr><td style="padding:0 4px 20px;">
        <img src="${LOGO_URL}" width="140" height="35" alt="LeadsMind" style="display:block;border:0;outline:none;text-decoration:none;height:auto;width:140px;">
      </td></tr>
      <tr><td style="background:#FFFFFF;border:1px solid ${BORDER};border-radius:16px;padding:36px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <h1 style="margin:0 0 16px;font-size:22px;line-height:1.35;font-weight:700;color:${TEXT};">You've been invited to join ${e(workspaceName)}</h1>
        <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:${MUTED};">${introHtml}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
          <tr><td align="center" bgcolor="${BRAND_BLUE}" style="border-radius:10px;background:${BRAND_BLUE};">
            <a href="${url}" target="_blank" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;line-height:1.2;color:#FFFFFF;text-decoration:none;border-radius:10px;">Accept invitation</a>
          </td></tr>
        </table>
        <p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:${SUBTLE};">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="margin:0 0 24px;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${url}" target="_blank" style="color:${BRAND_BLUE};text-decoration:underline;">${url}</a></p>
        <p style="margin:0;padding-top:20px;border-top:1px solid ${BORDER};font-size:13px;line-height:1.6;color:${SUBTLE};">This invitation expires in ${days} days. If you weren't expecting it, you can safely ignore this email.</p>
      </td></tr>
      <tr><td style="padding:20px 4px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${SUBTLE};">
        Sent by LeadsMind on behalf of ${e(workspaceName)}.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  return { subject, html, text };
}
