"use client";

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2, CheckCircle2, AlertTriangle, BookOpen, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { enrollStudent } from '@/app/actions/studentEnrollments';
import { createDirectCourseCheckoutSession, createCourseInstallmentCheckoutSession } from '@/app/actions/courseCommerce';
import { guestFreeEnroll, createGuestCourseCheckoutSession } from '@/app/actions/guestCheckout';
import { Button } from '@/components/ui/button';

// Light, warm-paper checkout — same palette/type as the public course description page
// (TemplatePremium) so the funnel reads as one product. Card payments run through Stripe's
// hosted checkout; that is the only real paid path (the old PayFast "sandbox" option never
// processed a real payment and has been removed), and the old hardcoded ~18.5 ZAR estimate
// went with it — prices show in their real USD.

const INK = '#0B1367';
const INK_SOFT = '#5A6478';
const PAPER = '#FBFAF7';
const LINE = '#E8E4DC';
const BRAND = '#1359FF';

interface CheckoutClientProps {
  course: any;
  user: any;
  workspaceId: string | null;
  contactId: string | null;
  isCapped: boolean;
  /** Rendered for a logged-out visitor: collect name+email for free courses, Stripe guest mode for paid. */
  isGuest?: boolean;
  /** ?status= on return from Stripe hosted checkout ('pending' | 'canceled'). Guest paid flow only. */
  postCheckoutStatus?: string | null;
  /** ?session_id= (Stripe's own {CHECKOUT_SESSION_ID} substitution) — drives the real
   *  enrollment-confirmation poll below. Absent on any pre-existing/bookmarked success link. */
  checkoutSessionId?: string | null;
}

type GuestPaidStatus = 'polling' | 'ready' | 'timed_out' | 'failed';

/** Shared shell for every full-page status screen (success / pending / capped / error). */
function StatusScreen({
  tone = 'neutral',
  icon,
  title,
  children,
  footer,
}: {
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const ring =
    tone === 'good'
      ? { bg: '#ECFDF3', fg: '#047857', bd: '#A7F3D0' }
      : tone === 'warn'
      ? { bg: '#FFFBEB', fg: '#B45309', bd: '#FDE68A' }
      : tone === 'bad'
      ? { bg: '#FEF2F2', fg: '#B91C1C', bd: '#FECACA' }
      : { bg: 'rgba(19,89,255,0.08)', fg: BRAND, bd: 'rgba(19,89,255,0.2)' };
  return (
    <div
      className="mx-auto flex max-w-lg flex-col items-center justify-center gap-5 rounded-2xl border bg-white px-10 py-16 text-center shadow-[0_20px_50px_-24px_rgba(11,19,103,0.25)]"
      style={{ borderColor: LINE }}
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full border"
        style={{ backgroundColor: ring.bg, color: ring.fg, borderColor: ring.bd }}
      >
        {icon}
      </div>
      <div className="space-y-2">
        <h2 className="font-display text-xl font-semibold" style={{ color: INK }}>
          {title}
        </h2>
        <div className="text-[13px] leading-relaxed" style={{ color: INK_SOFT }}>
          {children}
        </div>
      </div>
      {footer}
    </div>
  );
}

export default function CheckoutClient({
  course,
  user,
  workspaceId,
  contactId,
  isCapped,
  isGuest = false,
  postCheckoutStatus = null,
  checkoutSessionId = null,
}: CheckoutClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  // Guest-flow state
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [hp, setHp] = useState(''); // honeypot — real users never fill this
  const [guestEmailSent, setGuestEmailSent] = useState<boolean | null>(null);
  const [guestAlreadyEnrolled, setGuestAlreadyEnrolled] = useState(false);
  // Course Start Method 1 ("hold for manual approval") — real, distinct outcome from a normal
  // free enrollment: no access yet, no email yet.
  const [guestPendingApproval, setGuestPendingApproval] = useState(false);

  // Cohorts, Part 1: when the course has cohorts enabled, the student picks one before
  // completing enrolment — whichever start_method flow is active. Only non-full cohorts are
  // offered (getOpenCohorts filters on the server).
  const [cohorts, setCohorts] = useState<Array<{ id: string; name: string; start_date: string; end_date: string | null; seats_left: number }>>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<string>('');
  const cohortsRequired = !!course?.cohorts_enabled && cohorts.length > 0;
  useEffect(() => {
    if (!course?.cohorts_enabled) return;
    import('@/app/actions/courseCohorts').then(({ getOpenCohorts }) =>
      getOpenCohorts(course.id).then((r: any) => setCohorts(r.data || []))
    );
  }, [course?.id, course?.cohorts_enabled]);
  const cohortArg = () => (cohortsRequired ? { cohortId: selectedCohortId } : undefined);
  const cohortGuard = () => {
    if (cohortsRequired && !selectedCohortId) {
      toast.error('Please choose a cohort first.');
      return false;
    }
    return true;
  };

  // Real post-payment confirmation poll (guest paid flow only) — see
  // /api/checkout/guest-status. Never grants anything itself; it only ever repeats back what
  // that route already independently verified against Stripe's API + the real enrollments row.
  const [guestPaidStatus, setGuestPaidStatus] = useState<GuestPaidStatus>('polling');
  const pollStartRef = useRef<number>(Date.now());
  const POLL_INTERVAL_MS = 3000;
  const POLL_TIMEOUT_MS = 90_000; // real webhook latency is usually 1-5s; generous ceiling for slow/retried deliveries

  useEffect(() => {
    if (!isGuest || postCheckoutStatus !== 'pending' || !checkoutSessionId) return;

    let cancelled = false;
    pollStartRef.current = Date.now();

    const poll = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(
          `/api/checkout/guest-status?courseId=${encodeURIComponent(course.id)}&session_id=${encodeURIComponent(checkoutSessionId)}`
        );
        const data = await res.json();
        if (cancelled) return;

        if (data.status === 'ready' && data.redirectUrl) {
          setGuestPaidStatus('ready');
          window.location.href = data.redirectUrl;
          return;
        }

        if (data.status === 'failed' || data.status === 'invalid') {
          setGuestPaidStatus('failed');
          return;
        }

        // status === 'pending' — the real, expected async gap. Keep polling until the
        // timeout, at which point the backup email link (already sent by the webhook,
        // independent of this poll) becomes the primary path.
        if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
          setGuestPaidStatus('timed_out');
          return;
        }
        setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (cancelled) return;
        if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
          setGuestPaidStatus('timed_out');
        } else {
          setTimeout(poll, POLL_INTERVAL_MS);
        }
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest, postCheckoutStatus, checkoutSessionId, course.id]);

  const isFreeModel = course.pricing_model === 'free';
  const isHybridModel = course.pricing_model === 'hybrid';
  const isSubscriptionModel = course.pricing_model === 'subscription';
  const priceLabel = course.price ? `$${Number(course.price).toFixed(2)}` : null;
  const intervalSuffix = isSubscriptionModel ? `/${course.subscription_interval || 'month'}` : '';

  // ---- Handlers ---------------------------------------------------------------------------
  const handleCheckout = () => {
    if (!cohortGuard()) return;
    startTransition(async () => {
      try {
        // Course Start Method 4: a payment_plan course goes through the fixed-term installment
        // session; every other paid course keeps the one-time / open-ended-subscription session.
        const res = course.start_method === 'payment_plan'
          ? await createCourseInstallmentCheckoutSession(course.id, cohortArg())
          : await createDirectCourseCheckoutSession(course.id, cohortArg());
        if (res.error) {
          toast.error(res.error);
          return;
        }
        if (res.url) {
          window.location.href = res.url;
        } else {
          toast.error('We could not start the checkout. Please try again.');
        }
      } catch {
        toast.error('Something went wrong starting the payment. Please try again.');
      }
    });
  };

  const handleFreeEnrollment = () => {
    if (!cohortGuard()) return;
    startTransition(async () => {
      try {
        const enrollRes = await enrollStudent(course.id, cohortArg());
        if (enrollRes.error) {
          toast.error(enrollRes.error);
          return;
        }

        // Course Start Method 1 ("hold for manual approval"): a real signup with no access
        // yet — do NOT redirect into the player, it would just hit the "Access paused" gate.
        if ((enrollRes as any).pendingApproval) {
          setSuccess(true);
          setGuestPendingApproval(true);
          toast.success('You’re signed up — your enrolment is awaiting approval.');
          return;
        }

        setSuccess(true);
        toast.success('You’re enrolled.');
        setTimeout(() => {
          router.push(`/student/courses/${course.id}`);
        }, 1500);
      } catch {
        toast.error('We could not complete your free enrolment. Please try again.');
      }
    });
  };

  const handleGuestFree = () => {
    if (!cohortGuard()) return;
    startTransition(async () => {
      try {
        const res = await guestFreeEnroll({
          courseId: course.id,
          name: guestName,
          email: guestEmail,
          hp,
          ...(cohortArg() || {}),
        });
        if ((res as any).error) {
          toast.error((res as any).error);
          return;
        }
        const alreadyEnrolled = Boolean((res as any).alreadyEnrolled);
        const pendingApproval = Boolean((res as any).pendingApproval);
        setGuestAlreadyEnrolled(alreadyEnrolled);
        setGuestPendingApproval(pendingApproval);
        setGuestEmailSent(alreadyEnrolled || pendingApproval ? null : (((res as any).emailSent ?? null) as boolean | null));
        setSuccess(true);
        if (alreadyEnrolled) {
          toast.success('You were already enrolled — check your email to sign in.');
        } else if (pendingApproval) {
          toast.success('You’re signed up — your enrolment is awaiting approval.');
        } else {
          toast.success('You’re enrolled — check your email to set up your account.');
        }
      } catch {
        toast.error('We could not complete your enrolment. Please try again.');
      }
    });
  };

  const handleGuestPaid = () => {
    if (!cohortGuard()) return;
    startTransition(async () => {
      try {
        const res = await createGuestCourseCheckoutSession({ courseId: course.id, hp, ...(cohortArg() || {}) });
        if ((res as any).error) {
          toast.error((res as any).error);
          return;
        }
        if ((res as any).url) {
          window.location.href = (res as any).url;
        } else {
          toast.error('We could not start the checkout. Please try again.');
        }
      } catch {
        toast.error('Something went wrong starting the payment. Please try again.');
      }
    });
  };

  // Hidden honeypot input reused by both guest sub-flows.
  const honeypotField = (
    <div aria-hidden="true" className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden">
      <label>
        Do not fill this in
        <input type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
      </label>
    </div>
  );

  const textInput =
    'w-full rounded-xl border bg-white px-4 h-11 text-sm outline-none transition-colors focus:border-[#1359FF] focus-visible:ring-2 focus-visible:ring-[#1359FF]/30';

  // Cohorts, Part 1: real "choose your cohort" step, shown in every active start_method CTA
  // section when the course has cohorts enabled and at least one non-full cohort is open.
  const cohortPicker = cohortsRequired ? (
    <div className="mx-auto max-w-sm space-y-1.5 text-left">
      <label htmlFor="cohort-select" className="block text-[13px] font-semibold" style={{ color: INK }}>
        Choose your cohort
      </label>
      <select
        id="cohort-select"
        value={selectedCohortId}
        onChange={(e) => setSelectedCohortId(e.target.value)}
        className={textInput}
        style={{ borderColor: LINE, color: INK }}
      >
        <option value="">Select a cohort…</option>
        {cohorts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} — starts {new Date(c.start_date).toLocaleDateString()} ({c.seats_left} seat{c.seats_left === 1 ? '' : 's'} left)
          </option>
        ))}
      </select>
    </div>
  ) : null;

  const primaryBtn =
    'inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1359FF] focus-visible:ring-offset-2 disabled:opacity-50';

  // ======================================================================================
  // Guest returning from Stripe hosted checkout. NO enrollment logic here — the webhook is
  // what enrolls; this only reflects what the real /api/checkout/guest-status poll reports.
  // ======================================================================================
  if (isGuest && postCheckoutStatus === 'pending' && !success) {
    if (!checkoutSessionId) {
      return (
        <StatusScreen tone="good" icon={<CheckCircle2 size={30} />} title="Payment received">
          Once your payment clears, we’ll email account setup instructions for{' '}
          <strong style={{ color: INK }}>{course.title}</strong> to the address you used at checkout. This usually
          takes about a minute.
        </StatusScreen>
      );
    }
    if (guestPaidStatus === 'failed') {
      return (
        <StatusScreen tone="bad" icon={<AlertTriangle size={30} />} title="We couldn’t confirm this payment">
          If you were charged, check your email for a receipt and access link, or contact support with your payment
          confirmation and we’ll sort it out.
        </StatusScreen>
      );
    }
    if (guestPaidStatus === 'timed_out') {
      return (
        <StatusScreen tone="neutral" icon={<CheckCircle2 size={30} />} title="Almost there">
          Your payment is taking a little longer than usual to confirm. We’ve already emailed account setup
          instructions for <strong style={{ color: INK }}>{course.title}</strong> to the address you used at
          checkout — use that link to get in whenever it arrives.
        </StatusScreen>
      );
    }
    return (
      <StatusScreen
        tone="neutral"
        icon={<Loader2 size={30} className="animate-spin" />}
        title="Finishing your enrolment"
        footer={
          <p className="max-w-sm text-[11px]" style={{ color: INK_SOFT }}>
            We’ve also emailed a backup access link in case you close this page before it finishes.
          </p>
        }
      >
        Confirming your payment for <strong style={{ color: INK }}>{course.title}</strong> and setting up your
        account. This takes a few seconds — please don’t close this tab.
      </StatusScreen>
    );
  }

  // Enrolment closed (capacity reached)
  if (isCapped) {
    return (
      <StatusScreen
        tone="warn"
        icon={<Lock size={28} />}
        title="Enrolment is closed"
        footer={
          <Button
            onClick={() => router.push('/student/marketplace')}
            className="h-11 rounded-xl border bg-white px-8 text-[13px] font-semibold text-[#0B1367] hover:bg-[#FBFAF7]"
            style={{ borderColor: LINE }}
          >
            Browse other courses
          </Button>
        }
      >
        Enrolment for <strong style={{ color: INK }}>{course.title}</strong> has reached its limit, so registrations
        are closed for now.
      </StatusScreen>
    );
  }

  // Success screens
  if (success) {
    if (isGuest) {
      return (
        <StatusScreen
          tone="good"
          icon={<CheckCircle2 size={30} />}
          title={guestPendingApproval ? 'Awaiting approval' : 'You’re enrolled'}
          footer={
            <a href="/auth/student/login" className="text-[13px] font-semibold" style={{ color: BRAND }}>
              Go to student login
            </a>
          }
        >
          {guestPendingApproval ? (
            <>
              Your signup for <strong style={{ color: INK }}>{course.title}</strong> is on file, but this course
              needs manual approval. You’ll get an access-link email as soon as an admin approves you — nothing more
              to do right now.
            </>
          ) : (
            <>
              You’re enrolled in <strong style={{ color: INK }}>{course.title}</strong>.{' '}
              {guestAlreadyEnrolled ? (
                <>You were already enrolled — sign in any time from the student login page with this email address.</>
              ) : guestEmailSent === false ? (
                <>We couldn’t send your welcome email just now — you can sign in any time from the student login page with this email address.</>
              ) : (
                <>Check <strong style={{ color: INK }}>{guestEmail}</strong> for a link to set up your account and start learning.</>
              )}
            </>
          )}
        </StatusScreen>
      );
    }
    if (guestPendingApproval) {
      return (
        <StatusScreen tone="good" icon={<CheckCircle2 size={30} />} title="Awaiting approval">
          Your signup for <strong style={{ color: INK }}>{course.title}</strong> is on file, but this course needs
          manual approval. You’ll get an access-link email the moment an admin approves you.
        </StatusScreen>
      );
    }
    return (
      <StatusScreen
        tone="good"
        icon={<CheckCircle2 size={30} />}
        title="You’re enrolled"
        footer={
          <div className="flex items-center gap-2 text-[11px] font-medium" style={{ color: INK_SOFT }}>
            <Loader2 className="animate-spin" size={12} /> Taking you to the course…
          </div>
        }
      >
        Your payment for <strong style={{ color: INK }}>{course.title}</strong> went through and your access is
        active.
      </StatusScreen>
    );
  }

  // ======================================================================================
  // Main checkout view
  // ======================================================================================
  const guestNameEmailFields = (
    <div className="mx-auto max-w-sm space-y-3 text-left">
      {honeypotField}
      <input
        type="text"
        placeholder="Full name"
        value={guestName}
        onChange={(e) => setGuestName(e.target.value)}
        autoComplete="name"
        className={textInput}
        style={{ borderColor: LINE, color: INK }}
      />
      <input
        type="email"
        placeholder="you@example.com"
        value={guestEmail}
        onChange={(e) => setGuestEmail(e.target.value)}
        autoComplete="email"
        className={textInput}
        style={{ borderColor: LINE, color: INK }}
      />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-[12px] font-medium" style={{ color: INK_SOFT }}>
        <span>Checkout</span>
      </div>

      {isGuest && postCheckoutStatus === 'canceled' && (
        <div
          className="mx-auto max-w-2xl rounded-xl border px-4 py-3 text-center text-[12px]"
          style={{ borderColor: '#FDE68A', backgroundColor: '#FFFBEB', color: '#B45309' }}
        >
          Payment was cancelled — you have not been charged and no enrolment was created. You can try again below.
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* -------------------- ORDER SUMMARY -------------------- */}
        <div
          className="overflow-hidden rounded-2xl border bg-white shadow-[0_20px_50px_-24px_rgba(11,19,103,0.2)] lg:col-span-5"
          style={{ borderColor: LINE }}
        >
          <div className="aspect-[16/7] w-full overflow-hidden" style={{ background: PAPER }}>
            {course.thumbnail_url ? (
              <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <BookOpen size={32} style={{ color: INK_SOFT, opacity: 0.4 }} />
              </div>
            )}
          </div>

          <div className="space-y-5 p-6">
            <div className="space-y-1.5">
              <h3 className="font-display text-[17px] font-semibold leading-snug" style={{ color: INK }}>
                {course.title}
              </h3>
              {course.description && (
                <p className="text-[13px] leading-relaxed" style={{ color: INK_SOFT }}>
                  {course.description}
                </p>
              )}
            </div>

            <div className="space-y-2.5 border-t pt-4" style={{ borderColor: LINE }}>
              <Row label="Plan" value={
                isFreeModel ? 'Free access'
                : isHybridModel ? 'Free preview, upgrade anytime'
                : isSubscriptionModel ? `Subscription, billed ${course.subscription_interval || 'month'}ly`
                : 'One-time payment'
              } />
              {priceLabel && !isFreeModel && (
                <>
                  <Row label="Subtotal" value={`${priceLabel}${intervalSuffix} USD`} muted />
                  <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: LINE }}>
                    <span className="text-[13px] font-semibold" style={{ color: INK }}>Total due</span>
                    <span className="font-display text-lg font-bold" style={{ color: INK }}>
                      {priceLabel}
                      <span className="text-[11px] font-normal" style={{ color: INK_SOFT }}>{intervalSuffix} USD</span>
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* "What's included" — only structural facts that are genuinely true for every
                LeadsMind course. No numbers, no claims that need a policy that doesn't exist. */}
            <div className="space-y-2 rounded-xl border p-4" style={{ borderColor: LINE, background: PAPER }}>
              <div className="text-[12px] font-semibold" style={{ color: INK }}>What you get</div>
              <ul className="space-y-1.5 text-[12px]" style={{ color: INK_SOFT }}>
                <li>Full access to every published lesson in this course</li>
                <li>Quizzes and assignments with automatic grading where set up</li>
                <li>A certificate on completion, when the course offers one</li>
              </ul>
            </div>
          </div>
        </div>

        {/* -------------------- PAYMENT PANEL -------------------- */}
        <div
          className="space-y-6 rounded-2xl border bg-white p-6 shadow-[0_20px_50px_-24px_rgba(11,19,103,0.2)] lg:col-span-7"
          style={{ borderColor: LINE }}
        >
          {isFreeModel ? (
            <div className="space-y-5 py-4 text-center">
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(19,89,255,0.08)', color: BRAND }}
              >
                <BookOpen size={22} />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-display text-[16px] font-semibold" style={{ color: INK }}>
                  This course is free
                </h4>
                <p className="mx-auto max-w-sm text-[13px] leading-relaxed" style={{ color: INK_SOFT }}>
                  {isGuest
                    ? 'Enter your name and email to enrol. No payment and no password needed — we’ll email you a link to set up your account.'
                    : 'No payment needed. Enrol and start learning right away.'}
                </p>
              </div>

              {isGuest && guestNameEmailFields}
              {cohortPicker}

              <button
                onClick={isGuest ? handleGuestFree : handleFreeEnrollment}
                disabled={isPending || (isGuest && (!guestName.trim() || !guestEmail.trim()))}
                className={primaryBtn}
                style={{ backgroundColor: INK }}
              >
                {isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Enrolling…
                  </>
                ) : (
                  'Enrol for free'
                )}
              </button>
            </div>
          ) : isGuest ? (
            /* Guest paid — Stripe hosted checkout (guest mode). Email is collected on
               Stripe's page; enrolment happens in the webhook, never on return. */
            <div className="space-y-5">
              {honeypotField}
              <div className="border-b pb-4" style={{ borderColor: LINE }}>
                <h4 className="font-display text-[15px] font-semibold" style={{ color: INK }}>
                  How you’ll pay
                </h4>
                <p className="mt-1 text-[12px]" style={{ color: INK_SOFT }}>
                  You’ll enter your email and card details on Stripe’s secure page.
                </p>
              </div>

              <PaymentMethodRow />

              {cohortPicker}

              <button onClick={handleGuestPaid} disabled={isPending} className={primaryBtn} style={{ backgroundColor: INK }}>
                {isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Taking you to Stripe…
                  </>
                ) : (
                  <>Pay {priceLabel}{intervalSuffix} and enrol</>
                )}
              </button>

              <TrustLine />

              {isHybridModel && (
                <div className="space-y-3 border-t pt-4 text-center" style={{ borderColor: LINE }}>
                  <span className="block text-[12px]" style={{ color: INK_SOFT }}>
                    Or start with the free preview first
                  </span>
                  {guestNameEmailFields}
                  <button
                    onClick={handleGuestFree}
                    disabled={isPending || !guestName.trim() || !guestEmail.trim()}
                    className="text-[13px] font-semibold disabled:opacity-40"
                    style={{ color: BRAND }}
                  >
                    Enrol in the free preview
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Authenticated paid checkout */
            <div className="space-y-5">
              <div className="border-b pb-4" style={{ borderColor: LINE }}>
                <h4 className="font-display text-[15px] font-semibold" style={{ color: INK }}>
                  How you’ll pay
                </h4>
                <p className="mt-1 text-[12px]" style={{ color: INK_SOFT }}>
                  We’ll redirect you to Stripe to complete your payment securely, then bring you back.
                </p>
              </div>

              <PaymentMethodRow />

              {cohortPicker}

              <button onClick={handleCheckout} disabled={isPending} className={primaryBtn} style={{ backgroundColor: INK }}>
                {isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Taking you to Stripe…
                  </>
                ) : (
                  <>Continue to secure payment{priceLabel ? ` · ${priceLabel}${intervalSuffix}` : ''}</>
                )}
              </button>

              <TrustLine />

              {isHybridModel && (
                <div className="border-t pt-4 text-center" style={{ borderColor: LINE }}>
                  <span className="block text-[12px]" style={{ color: INK_SOFT }}>
                    Or start with the free preview first
                  </span>
                  <button
                    onClick={handleFreeEnrollment}
                    disabled={isPending}
                    className="mt-2 text-[13px] font-semibold"
                    style={{ color: BRAND }}
                  >
                    Enrol in the free preview
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span style={{ color: '#5A6478' }}>{label}</span>
      <span style={{ color: muted ? '#5A6478' : '#0B1367', fontWeight: muted ? 400 : 600 }}>{value}</span>
    </div>
  );
}

/** The one payment method LeadsMind actually processes. Not a toggle — there is nothing to
 *  toggle between now that the PayFast sandbox option is gone. */
function PaymentMethodRow() {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border px-4 py-3.5"
      style={{ borderColor: BRAND, backgroundColor: 'rgba(19,89,255,0.05)' }}
    >
      <span
        className="flex h-4 w-4 items-center justify-center rounded-full border-[5px]"
        style={{ borderColor: BRAND }}
        aria-hidden
      />
      <div className="min-w-0">
        <div className="text-[13px] font-semibold" style={{ color: INK }}>
          Card
        </div>
        <div className="text-[11px]" style={{ color: INK_SOFT }}>
          Visa, Mastercard and Amex, processed by Stripe
        </div>
      </div>
    </div>
  );
}

function TrustLine() {
  return (
    <p className="flex items-start justify-center gap-1.5 text-[11px]" style={{ color: INK_SOFT }}>
      <ShieldCheck size={13} className="mt-0.5 shrink-0" style={{ color: '#047857' }} />
      <span>Payments are handled on Stripe’s secure checkout page. LeadsMind never sees your card number.</span>
    </p>
  );
}
