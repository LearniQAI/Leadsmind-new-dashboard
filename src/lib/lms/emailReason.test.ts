import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendEmail = vi.fn();
const logErr = vi.fn();
const SENSITIVE = 'connect ECONNREFUSED 10.0.0.5:5432 password authentication failed for user "svc_admin"';

vi.mock('@/shared/logger', () => ({ logger: { error: (...a: any[]) => logErr(...a), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/email', async () => {
  const a: any = await vi.importActual('@/lib/email');
  return { ...a, sendEmail: (...x: any[]) => sendEmail(...x) };
});
vi.mock('@/lib/email/resolveConfig', () => ({ getWorkspaceEmailConfig: async () => ({ apiKey: 're_ws', fromEmail: 'me@acme.com', fromName: 'A' }) }));
vi.mock('@/lib/domains/coursePublicUrl.server', () => ({ getCoursePublicBase: async () => ({ origin: 'https://learn.example.com' }) }));
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const rows: Record<string, any> = {
        courses: { title: 'Course', onboarding_email_subject: null, onboarding_email_body: null },
        contacts: { email: 'student@example.com', first_name: 'S' },
        workspaces: { name: 'Acme' },
      };
      const q: any = { select: () => q, eq: () => q, maybeSingle: () => Promise.resolve({ data: rows[table] ?? null }), single: () => Promise.resolve({ data: rows[table] ?? null }) };
      return q;
    },
  }),
}));

import { sendCourseOnboardingEmail } from '@/lib/lms/onboardingEmail';
import { EmailSendError } from '@/lib/email';

beforeEach(() => { sendEmail.mockReset(); logErr.mockReset(); });

describe('sendCourseOnboardingEmail `reason` (returned to the public guest-checkout response)', () => {
  const opts = { courseId: 'c1', contactId: 'k1', workspaceId: 'w1' };

  it('passes through a provider/config rejection', async () => {
    sendEmail.mockImplementation(async () => { throw new EmailSendError('The to field must be a valid email address'); });
    expect(await sendCourseOnboardingEmail(opts)).toEqual({ sent: false, reason: 'The to field must be a valid email address' });
  });

  it('reduces an internal error to the generic code, and logs the real one', async () => {
    const internal = new Error(SENSITIVE);
    sendEmail.mockImplementation(async () => { throw internal; });
    const r = await sendCourseOnboardingEmail(opts);
    expect(r).toEqual({ sent: false, reason: 'send_failed' });
    expect(JSON.stringify(r)).not.toMatch(/ECONNREFUSED|svc_admin/);
    expect(logErr).toHaveBeenCalledWith(expect.objectContaining({ err: internal }), 'lms.onboarding_email.send_failed');
  });
});
