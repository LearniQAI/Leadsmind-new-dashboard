import { describe, expect, it } from 'vitest';
import { renderWorkspaceInviteEmail, inviteRoleLabel } from './workspaceInvite';

const SAMPLES = [
  { workspaceName: "Olu Max's Workspace", inviterName: 'Olu Max', role: 'member', acceptUrl: 'https://www.leadsmind.io/auth/accept-invite?token=aaa' },
  { workspaceName: 'Zain Workspace', inviterName: 'Zain ul Hassan', role: 'admin', acceptUrl: 'https://www.leadsmind.io/auth/accept-invite?token=bbb' },
  { workspaceName: 'Santkumar & Co', inviterName: null, role: 'hr', acceptUrl: 'https://www.leadsmind.io/auth/accept-invite?token=ccc' },
];

// Strips every dynamic value so what remains is the fixed branded shell.
function shell(html: string, s: (typeof SAMPLES)[number]) {
  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  let out = html;
  for (const v of [s.workspaceName, s.inviterName, s.acceptUrl, inviteRoleLabel(s.role)].filter(Boolean) as string[]) {
    out = out.split(esc(v)).join('§');
  }
  return out
    .replace(/<title>[^<]*<\/title>/, '')
    .replace(/<div style="display:none[^>]*>[^<]*<\/div>/, '')
    .replace(/<p style="margin:0 0 28px;[^"]*">[\s\S]*?<\/p>/, '');
}

describe('renderWorkspaceInviteEmail', () => {
  it('interpolates workspace, inviter and role per workspace', () => {
    const [a, b, c] = SAMPLES.map(renderWorkspaceInviteEmail);
    expect(a.subject).toBe("Olu Max invited you to join Olu Max's Workspace on LeadsMind");
    expect(b.subject).toBe('Zain ul Hassan invited you to join Zain Workspace on LeadsMind');
    expect(c.subject).toBe("You've been invited to join Santkumar & Co on LeadsMind");
    expect(a.text).toContain("Olu Max has invited you to join Olu Max's Workspace on LeadsMind with the Member role.");
    expect(b.text).toContain('with the Admin role.');
    expect(c.text).toContain('with the HR role.');
    SAMPLES.forEach((s, i) => {
      const r = [a, b, c][i];
      expect(r.html).toContain(`href="${s.acceptUrl}"`);
      expect(r.text).toContain(s.acceptUrl);
    });
  });

  it('keeps branding identical regardless of which workspace sent it', () => {
    const shells = SAMPLES.map((s) => shell(renderWorkspaceInviteEmail(s).html, s));
    expect(shells[1]).toBe(shells[0]);
    expect(shells[2]).toBe(shells[0]);
    const html = renderWorkspaceInviteEmail(SAMPLES[0]).html;
    expect(html).toContain('https://www.leadsmind.io/assets/images/brand/LeadsMind_Logo.png.png');
    expect(html).toContain('#1359FF');
  });

  it('escapes user-controlled names so they cannot inject markup', () => {
    const r = renderWorkspaceInviteEmail({
      workspaceName: '<a href="https://evil.test">Claim prize</a>',
      inviterName: '<img src=x onerror=alert(1)>',
      role: 'member',
      acceptUrl: 'https://www.leadsmind.io/auth/accept-invite?token=x',
    });
    expect(r.html).not.toContain('<a href="https://evil.test">');
    expect(r.html).not.toContain('<img src=x');
    expect(r.html).toContain('&lt;a href=&quot;https://evil.test&quot;&gt;');
  });

  it('has a plain-text part and none of the old jargon or all-caps labels', () => {
    for (const s of SAMPLES) {
      const r = renderWorkspaceInviteEmail(s);
      expect(r.text.length).toBeGreaterThan(100);
      const all = `${r.subject}\n${r.html}\n${r.text}`;
      expect(all).not.toMatch(/access protocol|initiali[sz]e your node|authori[sz]ed to join|text-transform:\s*uppercase/i);
      expect(all).not.toMatch(/\b(MEMBER|ADMIN|VIEWER|PAYROLL)\b/);
    }
  });
});
