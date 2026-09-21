import { describe, it, expect, vi, beforeEach } from 'vitest';

const welcome = vi.fn();

vi.mock('@/shared/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('next/headers', () => ({ headers: () => new Headers({ 'x-forwarded-for': '10.3.3.3' }) }));
vi.mock('@/lib/paymentGateways/stripeForWorkspace', () => ({ stripeForWorkspace: vi.fn() }));
vi.mock('@/lib/domains/coursePublicUrl.server', () => ({ getCoursePublicBase: async () => ({ origin: 'https://x.example.com' }) }));
vi.mock('../../../libs/core/src/events/lms-event-bus', () => ({ emitLMSEvent: vi.fn() }));
vi.mock('@/lib/webhooks/dispatcher', () => ({ dispatchWebhook: vi.fn(async () => {}) }));
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: () => {
      const q: any = {
        select: () => q, eq: () => q,
        maybeSingle: () => Promise.resolve({
          data: { id: 'c1', workspace_id: 'w1', pricing_model: 'free', published: true, status: 'published', enrolment_cap: null, start_method: 'instant_payment', email_access_auto_send: false, cohorts_enabled: false },
        }),
      };
      return q;
    },
  }),
}));
vi.mock('@/lib/lms/guestEnrollment', () => ({
  findOrCreateContactByEmail: async () => ({ contactId: 'k1', created: true }),
  insertEnrollmentIfAbsent: async () => ({ enrolled: true, alreadyEnrolled: false }),
  isWorkspaceStaffEmail: async () => false,
  welcomeGuestStudent: (...a: any[]) => welcome(...a),
}));

import { guestFreeEnroll } from '@/app/actions/guestCheckout';

let n = 0;
const enroll = () => guestFreeEnroll({ courseId: 'c1', name: 'Guest', email: `g${++n}@example.com` });

beforeEach(() => welcome.mockReset());

describe('public guest free enrolment: emailReason is a fixed code, never upstream text', () => {
  it.each([
    ['a provider rejection', 'API key is invalid'],
    ['an internal error', 'connect ECONNREFUSED 10.0.0.5:5432 password authentication failed for user "svc_admin"'],
    ['a helper code', 'contact_has_no_email'],
  ])('%s is not forwarded', async (_label, upstream) => {
    welcome.mockResolvedValue({ emailSent: false, emailReason: upstream });
    const r: any = await enroll();
    expect(r.success).toBe(true);
    expect(r.emailSent).toBe(false);
    expect(r.emailReason).toBe('send_failed');
    expect(JSON.stringify(r)).not.toContain(upstream);
  });

  it('a successful send carries no reason at all', async () => {
    welcome.mockResolvedValue({ emailSent: true });
    const r: any = await enroll();
    expect(r).toEqual({ success: true, alreadyEnrolled: false, emailSent: true, emailReason: undefined });
  });
});
