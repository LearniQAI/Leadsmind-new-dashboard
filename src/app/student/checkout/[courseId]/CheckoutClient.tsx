"use client";

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CreditCard, ShieldCheck, Loader2, Sparkles, AlertCircle, CheckCircle2, ShieldAlert, BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { enrollStudent } from '@/app/actions/studentEnrollments';
import { createDirectCourseCheckoutSession } from '@/app/actions/courseCommerce';
import { Button } from '@/components/ui/button';

interface CheckoutClientProps {
  course: any;
  user: any;
  workspaceId: string;
  contactId: string;
  isCapped: boolean;
}

export default function CheckoutClient({ course, user, workspaceId, contactId, isCapped }: CheckoutClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [paymentMethod, setPaymentMethod] = useState<'payfast' | 'stripe'>('stripe');
  const [success, setSuccess] = useState(false);

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

        // Simulate PayFast payment flow
        const webhookPayload = {
          payment_status: "COMPLETE",
          email_address: user.email,
          custom_str1: workspaceId,
          custom_str2: contactId,
          custom_str3: course.id,
          item_name: course.title,
          amount_gross: course.price
        };

        const webhookRes = await fetch('/api/webhooks/payfast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload)
        });

        if (!webhookRes.ok) {
          console.warn("[Checkout] Webhook simulator warning:", await webhookRes.text());
        }

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
                This course is set to Free Access. You do not need to enter any payment credentials to enroll and begin learning.
              </p>
            </div>
            <button
              onClick={handleFreeEnrollment}
              disabled={isPending}
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

        <div className="border-t border-white/5 pt-4 flex items-center justify-between text-white/30 text-[9px] font-bold uppercase tracking-widest">
          <span className="flex items-center gap-1"><ShieldCheck size={11} className="text-emerald-400" /> SSL 256-bit encryption</span>
          <span>Gateway: ACTIVE</span>
        </div>
      </div>
    </div>
  );
}
