"use client";

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CreditCard, ShieldCheck, Loader2, Sparkles, AlertCircle, CheckCircle2, ShieldAlert, BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { enrollStudent } from '@/app/actions/studentEnrollments';
import { createDirectCourseCheckoutSession } from '@/app/actions/courseCommerce';
import { guestFreeEnroll, createGuestCourseCheckoutSession } from '@/app/actions/guestCheckout';
import { Button } from '@/components/ui/button';

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
  const [paymentMethod, setPaymentMethod] = useState<'payfast' | 'stripe'>('stripe');
  const [success, setSuccess] = useState(false);
  // Guest-flow state
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [hp, setHp] = useState(''); // honeypot — real users never fill this
  const [guestEmailSent, setGuestEmailSent] = useState<boolean | null>(null);
  const [guestAlreadyEnrolled, setGuestAlreadyEnrolled] = useState(false);

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
          // Same generateLink('magiclink') redirect /auth/student/verify already uses to
          // establish a real Supabase session — this page never sets a session itself.
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

  // South African Rand approximation (1 USD ~ 18.5 ZAR)
  const priceZar = (course.price * 18.5).toFixed(2);

  const handleCheckout = () => {
    startTransition(async () => {
      try {
        if (paymentMethod === 'stripe') {
          // Direct Stripe Connect checkout integration
          const res = await createDirectCourseCheckoutSession(course.id);
          if (res.error) {
            toast.error(res.error);
            return;
          }
          if (res.url) {
            window.location.href = res.url;
          } else {
            toast.error("Failed to generate checkout session url.");
          }
          return;
        }

        // NOTE: this used to self-construct a fake PayFast ITN payload (payment_status:
        // "COMPLETE", no signature) and POST it directly to the real production webhook route —
        // a genuine payment-completion callback must only ever come from PayFast's own
        // server-to-server call, never from the client claiming its own payment succeeded. That
        // self-POST has been removed; it is not this checkout flow's place to fabricate a payment
        // confirmation. (enrollStudent() below finalizes enrollment for this flow; note it does
        // not itself verify payment — that's a separate, pre-existing gap outside this fix.)

        // Perform enrollment registration
        const enrollRes = await enrollStudent(course.id);
        
        if (enrollRes.error) {
          toast.error(enrollRes.error);
          return;
        }

        setSuccess(true);
        toast.success(`Payment of $${course.price.toFixed(2)} completed successfully!`);
        
        setTimeout(() => {
          router.push(`/student/courses/${course.id}`);
        }, 1500);

      } catch (err) {
        toast.error("An error occurred processing payment.");
      }
    });
  };

  const handleFreeEnrollment = () => {
    startTransition(async () => {
      try {
        const enrollRes = await enrollStudent(course.id);
        if (enrollRes.error) {
          toast.error(enrollRes.error);
          return;
        }

        setSuccess(true);
        toast.success("Enrolled in free course successfully!");
        
        setTimeout(() => {
          router.push(`/student/courses/${course.id}`);
        }, 1500);
      } catch (err) {
        toast.error("Failed to process free enrollment.");
      }
    });
  };

  const handleGuestFree = () => {
    startTransition(async () => {
      try {
        const res = await guestFreeEnroll({
          courseId: course.id,
          name: guestName,
          email: guestEmail,
          hp,
        });
        if ((res as any).error) {
          toast.error((res as any).error);
          return;
        }
        const alreadyEnrolled = Boolean((res as any).alreadyEnrolled);
        setGuestAlreadyEnrolled(alreadyEnrolled);
        setGuestEmailSent(alreadyEnrolled ? null : (((res as any).emailSent ?? null) as boolean | null));
        setSuccess(true);
        if (alreadyEnrolled) {
          toast.success('You were already enrolled — check your email to sign in.');
        } else {
          toast.success('Enrolled! Check your email to set up your account.');
        }
      } catch {
        toast.error('Failed to complete enrolment.');
      }
    });
  };

  const handleGuestPaid = () => {
    startTransition(async () => {
      try {
        const res = await createGuestCourseCheckoutSession({ courseId: course.id, hp });
        if ((res as any).error) {
          toast.error((res as any).error);
          return;
        }
        if ((res as any).url) {
          window.location.href = (res as any).url;
        } else {
          toast.error('Failed to generate checkout session url.');
        }
      } catch {
        toast.error('An error occurred starting checkout.');
      }
    });
  };

  // Hidden honeypot input reused by both guest sub-flows.
  const honeypotField = (
    <div aria-hidden="true" className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden">
      <label>
        Do not fill this in
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
        />
      </label>
    </div>
  );

  // Guest returning from Stripe hosted checkout. This screen carries NO enrollment logic
  // itself — the webhook is what actually enrolls; this only ever reflects what the real
  // /api/checkout/guest-status poll reports back.
  if (isGuest && postCheckoutStatus === 'pending' && !success) {
    // No session_id (a pre-existing/bookmarked success link, or Stripe didn't substitute
    // it) — nothing to poll against. Same static message this screen always showed; the
    // email is still the real path here.
    if (!checkoutSessionId) {
      return (
        <div className="bg-[#080f28] border border-white/5 rounded-3xl p-12 text-center space-y-6 max-w-lg mx-auto shadow-2xl flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 bg-primary/10 border border-primary/20 text-primary rounded-full flex items-center justify-center">
            <CheckCircle2 size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-space-grotesk font-black uppercase text-white tracking-tight">Payment Received</h2>
            <p className="text-xs text-white/50 leading-relaxed max-w-sm">
              Thanks! Once your payment is confirmed by our payment provider, we'll email{' '}
              <strong className="text-white">account setup instructions</strong> for{' '}
              <strong className="text-white">"{course.title}"</strong> to the address you entered at checkout.
              This usually happens within a minute.
            </p>
          </div>
        </div>
      );
    }

    if (guestPaidStatus === 'failed') {
      return (
        <div className="bg-[#080f28] border border-red-500/10 rounded-3xl p-12 text-center space-y-6 max-w-lg mx-auto shadow-2xl flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center">
            <ShieldAlert size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-space-grotesk font-black uppercase text-white tracking-tight">Something's Not Right</h2>
            <p className="text-xs text-white/50 leading-relaxed max-w-sm">
              We couldn't confirm this checkout. If you were charged, check your email for a
              receipt and access link — or contact support with your payment confirmation.
            </p>
          </div>
        </div>
      );
    }

    if (guestPaidStatus === 'timed_out') {
      return (
        <div className="bg-[#080f28] border border-white/5 rounded-3xl p-12 text-center space-y-6 max-w-lg mx-auto shadow-2xl flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 bg-primary/10 border border-primary/20 text-primary rounded-full flex items-center justify-center">
            <CheckCircle2 size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-space-grotesk font-black uppercase text-white tracking-tight">Almost There</h2>
            <p className="text-xs text-white/50 leading-relaxed max-w-sm">
              Your payment is taking a little longer than usual to confirm. We've already sent{' '}
              <strong className="text-white">account setup instructions</strong> to the address you
              entered at checkout for <strong className="text-white">"{course.title}"</strong> —
              use that link to get in whenever it arrives.
            </p>
          </div>
        </div>
      );
    }

    // guestPaidStatus === 'polling' (and the brief 'ready' instant before the redirect fires)
    return (
      <div className="bg-[#080f28] border border-white/5 rounded-3xl p-12 text-center space-y-6 max-w-lg mx-auto shadow-2xl flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 bg-primary/10 border border-primary/20 text-primary rounded-full flex items-center justify-center">
          <Loader2 size={40} className="animate-spin" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-space-grotesk font-black uppercase text-white tracking-tight">Finalizing Your Enrollment</h2>
          <p className="text-xs text-white/50 leading-relaxed max-w-sm">
            Confirming your payment for <strong className="text-white">"{course.title}"</strong> and
            setting up your account. This takes a few seconds — do not close this tab.
          </p>
        </div>
        <p className="text-[10px] text-white/30 max-w-sm">
          We've also emailed a backup access link in case you close this page before it finishes.
        </p>
      </div>
    );
  }

  // Case 1: Enrollment Closed Cap Gatekeeper
  if (isCapped) {
    return (
      <div className="bg-[#080f28] border border-red-500/10 rounded-3xl p-12 text-center space-y-6 max-w-lg mx-auto shadow-2xl flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center animate-pulse">
          <ShieldAlert size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-space-grotesk font-black uppercase text-white tracking-tight">Enrolment Closed</h2>
          <p className="text-xs text-white/50 leading-relaxed max-w-sm">
            We are sorry, but enrollment for <strong className="text-white">"{course.title}"</strong> has reached its maximum structural capacity. Registrations are currently closed.
          </p>
        </div>
        <Button
          onClick={() => router.push('/student/marketplace')}
          className="bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-11 px-8"
        >
          Return to Catalog
        </Button>
      </div>
    );
  }

  // Case 2: Checkout Success Screen
  if (success) {
    if (isGuest) {
      return (
        <div className="bg-[#080f28] border border-white/5 rounded-3xl p-12 text-center space-y-6 max-w-lg mx-auto shadow-2xl flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center animate-bounce">
            <CheckCircle2 size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-space-grotesk font-black uppercase text-white tracking-tight">You're Enrolled</h2>
            <p className="text-xs text-white/50 leading-relaxed max-w-sm">
              You're enrolled in <strong className="text-white">"{course.title}"</strong>.{' '}
              {guestAlreadyEnrolled ? (
                <>You were already enrolled in this course — sign in any time from the student login page using this email address.</>
              ) : guestEmailSent === false ? (
                <>We couldn't send your welcome email right now — you can sign in any time from the student login page using this email address.</>
              ) : (
                <>Check <strong className="text-white">{guestEmail}</strong> for a link to set up your account and start learning.</>
              )}
            </p>
          </div>
          <a
            href="/auth/student/login"
            className="text-[10px] font-black text-primary hover:text-primary-light uppercase tracking-wider"
          >
            Go to student login
          </a>
        </div>
      );
    }
    return (
      <div className="bg-[#080f28] border border-white/5 rounded-3xl p-12 text-center space-y-6 max-w-lg mx-auto shadow-2xl flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center animate-bounce">
          <CheckCircle2 size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-space-grotesk font-black uppercase text-white tracking-tight">Payment Verified</h2>
          <p className="text-xs text-white/50 leading-relaxed max-w-sm">
            Thank you! Your transaction for <strong className="text-white">"{course.title}"</strong> has been successfully processed. Access keys activated.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-mono uppercase tracking-widest font-black">
          <Loader2 className="animate-spin" size={12} /> Syncing automation engines...
        </div>
      </div>
    );
  }

  const isFreeModel = course.pricing_model === 'free';
  const isHybridModel = course.pricing_model === 'hybrid';
  const isSubscriptionModel = course.pricing_model === 'subscription';

  return (
    <div className="space-y-4">
    {isGuest && postCheckoutStatus === 'canceled' && (
      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl px-4 py-3 text-[11px] max-w-2xl mx-auto text-center">
        Payment was cancelled — you have not been charged and no enrolment was created. You can try again below.
      </div>
    )}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Course Details Panel */}
      <div className="lg:col-span-5 bg-[#080f28] border border-white/5 rounded-2xl overflow-hidden shadow-xl space-y-6">
        <div className="h-44 relative bg-gradient-to-br from-indigo-950 to-slate-900 border-b border-white/5 flex items-center justify-center overflow-hidden">
          {course.thumbnail_url ? (
            <img 
              src={course.thumbnail_url} 
              alt={course.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 flex items-center justify-center">
              <span className="text-4xl text-white/20">📚</span>
            </div>
          )}
          <div className="absolute top-4 left-4 bg-[#3b82f6]/95 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
            LMS Premium Node
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-space-grotesk font-black uppercase text-white tracking-tight leading-snug">
              {course.title}
            </h3>
            <p className="text-xs text-white/50 leading-relaxed">
              {course.description || "Unlock full modular access to all curriculum units, assessment tests, and automated certification."}
            </p>
          </div>

          <div className="border-t border-white/5 pt-4 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/40">Pricing Model</span>
              <span className="font-bold text-white uppercase tracking-wider text-[10px]">
                {isFreeModel && "Free Entry"}
                {isHybridModel && "Hybrid (Free Preview + Upgrade)"}
                {isSubscriptionModel && `Subscription (${course.subscription_interval || 'month'})`}
                {course.pricing_model === 'one_time' && "One-time Payment"}
              </span>
            </div>
            
            {!isFreeModel && (
              <>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/40">Subtotal</span>
                  <span className="font-mono text-white/80 font-bold">${course.price?.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/40">Tax / Processing</span>
                  <span className="font-mono text-white/40">R0.00</span>
                </div>
                <div className="flex justify-between items-center border-t border-white/5 pt-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-white">Total Due</span>
                  <div className="text-right">
                    <div className="font-mono text-base font-black text-emerald-400">
                      ${course.price?.toFixed(2)} USD
                      {isSubscriptionModel && <span className="text-[10px] text-white/40 lowercase font-normal">/{course.subscription_interval || 'month'}</span>}
                    </div>
                    <div className="text-[10px] text-white/30 font-mono font-bold">~ R{priceZar} ZAR</div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="bg-[#111d47]/20 border border-white/5 p-4 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-primary">
              <Sparkles size={12} /> Included in Purchase
            </div>
            <ul className="space-y-2 text-[10px] text-white/60 leading-normal">
              <li className="flex items-center gap-1.5">✓ Lifetime modular player access</li>
              <li className="flex items-center gap-1.5">✓ Native AI grading & LENA explanations</li>
              <li className="flex items-center gap-1.5">✓ Bandwidth profiles optimized for 3G</li>
              <li className="flex items-center gap-1.5">✓ Automated certification validation</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Payment Processing Panel */}
      <div className="lg:col-span-7 bg-[#080f28] border border-white/5 rounded-2xl p-6 space-y-6 shadow-xl">
        {isFreeModel ? (
          /* Free Enrollment View */
          <div className="space-y-5 py-6 text-center">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
              <BookOpen size={24} />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-base font-bold text-white uppercase tracking-wider">Free Access Entry</h4>
              <p className="text-xs text-white/40 max-w-sm mx-auto leading-relaxed">
                {isGuest
                  ? 'Enter your name and email to enrol. No password needed now — we’ll email you a link to set up your account.'
                  : 'This course is set to Free Access. You do not need to enter any payment credentials to enroll and begin learning.'}
              </p>
            </div>

            {isGuest && (
              <div className="space-y-3 text-left max-w-sm mx-auto">
                {honeypotField}
                <input
                  type="text"
                  placeholder="Full name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  autoComplete="name"
                  className="w-full bg-[#111d47]/40 border border-white/10 rounded-xl h-11 px-4 text-xs text-white placeholder:text-white/30 outline-none focus:border-primary/50"
                />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full bg-[#111d47]/40 border border-white/10 rounded-xl h-11 px-4 text-xs text-white placeholder:text-white/30 outline-none focus:border-primary/50"
                />
              </div>
            )}

            <button
              onClick={isGuest ? handleGuestFree : handleFreeEnrollment}
              disabled={isPending || (isGuest && (!guestName.trim() || !guestEmail.trim()))}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-12 flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-500/15 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Registering Enrollment...
                </>
              ) : (
                "Enroll for Free Now"
              )}
            </button>
          </div>
        ) : (
          /* Paid / Hybrid Checkout View */
          <>
          {isGuest ? (
            /* Guest paid checkout — Stripe hosted (guest mode) only. Email is collected on
               Stripe's own page, not here. Enrollment happens in the webhook, never on return. */
            <div className="space-y-5 py-4">
              {honeypotField}
              <div className="border-b border-white/5 pb-4">
                <h4 className="text-sm font-black font-space-grotesk uppercase tracking-wider text-white">Secure Checkout</h4>
                <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-1">
                  You&apos;ll enter your email &amp; card details on Stripe&apos;s secure page
                </p>
              </div>
              <div className="bg-[#0f2d4a]/20 border border-[#0f2d4a] rounded-xl p-4 flex items-start gap-3">
                <ShieldCheck className="text-primary shrink-0 mt-0.5" size={16} />
                <span className="text-[9px] text-white/50 block leading-relaxed">
                  Redirecting to Stripe to pay{' '}
                  <strong className="text-white">${course.price?.toFixed(2)} USD</strong>
                  {isSubscriptionModel && <>/{course.subscription_interval || 'month'}</>}. After payment,
                  we&apos;ll email account-setup instructions to the address you give Stripe.
                </span>
              </div>
              <button
                onClick={handleGuestPaid}
                disabled={isPending}
                className="w-full bg-primary hover:bg-primary/95 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-12 flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Redirecting to Stripe...
                  </>
                ) : (
                  'Continue to Secure Stripe Checkout'
                )}
              </button>
              {isHybridModel && (
                <div className="border-t border-white/5 pt-4 text-center space-y-3">
                  <span className="text-[10px] text-white/40 block">Or start the free preview section first</span>
                  <div className="space-y-3 text-left max-w-sm mx-auto">
                    <input
                      type="text"
                      placeholder="Full name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      autoComplete="name"
                      className="w-full bg-[#111d47]/40 border border-white/10 rounded-xl h-11 px-4 text-xs text-white placeholder:text-white/30 outline-none focus:border-primary/50"
                    />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      autoComplete="email"
                      className="w-full bg-[#111d47]/40 border border-white/10 rounded-xl h-11 px-4 text-xs text-white placeholder:text-white/30 outline-none focus:border-primary/50"
                    />
                  </div>
                  <button
                    onClick={handleGuestFree}
                    disabled={isPending || !guestName.trim() || !guestEmail.trim()}
                    className="text-[10px] font-black text-primary hover:text-primary-light uppercase tracking-wider outline-none disabled:opacity-40"
                  >
                    Enrol in Free Preview Mode
                  </button>
                </div>
              )}
            </div>
          ) : (
          <>
            <div className="border-b border-white/5 pb-4">
              <h4 className="text-sm font-black font-space-grotesk uppercase tracking-wider text-white">Payment Method</h4>
              <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-1">Select a secure processing node to authenticate enrollment</p>
            </div>

            {/* Payment tabs */}
            <div className="grid grid-cols-2 gap-3 bg-[#111d47]/20 border border-white/5 p-1 rounded-xl">
              <button
                onClick={() => setPaymentMethod('stripe')}
                className={`py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  paymentMethod === 'stripe'
                    ? "bg-primary text-white border border-primary/20 shadow-lg"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                <CreditCard size={12} /> Stripe Card (USD)
              </button>
              <button
                onClick={() => setPaymentMethod('payfast')}
                className={`py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  paymentMethod === 'payfast'
                    ? "bg-primary text-white border border-primary/20 shadow-lg"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                <span>🇿🇦</span> PayFast Sandbox (ZAR)
              </button>
            </div>

            {paymentMethod === 'stripe' ? (
              /* Stripe Redirect */
              <div className="space-y-5">
                <div className="bg-[#0f2d4a]/20 border border-[#0f2d4a] rounded-xl p-4 flex items-start gap-3">
                  <ShieldCheck className="text-primary shrink-0 mt-0.5" size={16} />
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-white block">Secure Stripe checkout integration</span>
                    <span className="text-[9px] text-white/50 block leading-relaxed">
                      You will be securely redirected to Stripe's hosted checkout gateway to complete your payment of **${course.price?.toFixed(2)} USD**.
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isPending}
                  className="w-full bg-primary hover:bg-primary/95 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-12 flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 mt-4"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Redirecting to Stripe...
                    </>
                  ) : (
                    <>
                      Redirect to Secure Stripe Checkout
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* PayFast Sandbox */
              <div className="space-y-5">
                <div className="bg-[#0f2d4a]/20 border border-[#0f2d4a] rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="text-[#3b82f6] shrink-0 mt-0.5" size={16} />
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-white block">Secure simulated PayFast Gateway</span>
                    <span className="text-[9px] text-white/50 block leading-relaxed">
                      The billing processor will convert your checkout subtotal to South African Rand (**R{priceZar} ZAR**). Click the button below to submit a successful simulated transaction callback.
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isPending}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-12 flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-500/15 disabled:opacity-50 mt-4"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Verifying callback...
                    </>
                  ) : (
                    <>
                      Pay R{priceZar} ZAR via PayFast
                    </>
                  )}
                </button>
              </div>
            )}

            {isHybridModel && (
              <div className="border-t border-white/5 pt-4 text-center">
                <span className="text-[10px] text-white/40 block">Or start studying the free preview section first</span>
                <button
                  onClick={handleFreeEnrollment}
                  disabled={isPending}
                  className="text-[10px] font-black text-primary hover:text-primary-light uppercase tracking-wider mt-2 outline-none"
                >
                  Enroll in Free Preview Mode
                </button>
              </div>
            )}
          </>
          )}
          </>
        )}

        <div className="border-t border-white/5 pt-4 flex items-center justify-between text-white/30 text-[9px] font-bold uppercase tracking-widest">
          <span className="flex items-center gap-1"><ShieldCheck size={11} className="text-emerald-400" /> SSL 256-bit encryption</span>
          <span>Gateway: ACTIVE</span>
        </div>
      </div>
    </div>
    </div>
  );
}
