"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, Users, ShieldCheck, Sparkles, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { updateCoursePricing, getWorkspacePaymentIntegration } from "@/app/actions/courseCommerce";

interface CoursePricingFormProps {
  course: any;
  onSaved: (updatedCourse: any) => void;
}

export default function CoursePricingForm({ course, onSaved }: CoursePricingFormProps) {
  const [isPending, startTransition] = useTransition();
  
  // Pricing Settings Matrix
  const [pricingModel, setPricingModel] = useState<'free' | 'one_time' | 'subscription' | 'hybrid'>(
    course.pricing_model || 'free'
  );
  const [price, setPrice] = useState<string>(course.price?.toString() || "0.00");
  const [subInterval, setSubInterval] = useState<'month' | 'year'>((course.subscription_interval as any) || 'month');
  const [enrolmentCap, setEnrolmentCap] = useState<string>(course.enrolment_cap?.toString() || "");

  // Gateway Connection Status
  const [gatewayStatus, setGatewayStatus] = useState<{
    connected: boolean;
    publishableKey?: string;
  }>({ connected: false });
  const [checkingGateway, setCheckingGateway] = useState(true);

  useEffect(() => {
    async function checkGateway() {
      const status = await getWorkspacePaymentIntegration();
      setGatewayStatus(status);
      setCheckingGateway(false);
    }
    checkGateway();
  }, []);

  const handleSavePricing = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const numericPrice = parseFloat(price);
      if (isNaN(numericPrice) || numericPrice < 0) {
        toast.error("Invalid price value");
        return;
      }

      const parsedCap = enrolmentCap.trim() === "" ? null : parseInt(enrolmentCap);
      if (parsedCap !== null && (isNaN(parsedCap) || parsedCap < 0)) {
        toast.error("Invalid enrolment cap value");
        return;
      }

      const res = await updateCoursePricing(course.id, {
        pricing_model: pricingModel,
        price: numericPrice,
        subscription_interval: pricingModel === 'subscription' ? subInterval : null,
        enrolment_cap: parsedCap
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Pricing configurations locked in successfully.");
        onSaved({
          ...course,
          pricing_model: pricingModel,
          price: numericPrice,
          subscription_interval: pricingModel === 'subscription' ? subInterval : null,
          enrolment_cap: parsedCap
        });
      }
    });
  };

  return (
    <form onSubmit={handleSavePricing} className="bg-[#080f28] border border-white/5 rounded-2xl p-6 space-y-6">
      <div className="border-b border-white/5 pb-4">
        <h2 className="text-base font-black font-space-grotesk uppercase tracking-wider text-white">
          Course Pricing & Commerce Engine
        </h2>
        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">
          Select commercial models, intervals, enrollment constraints, and connect stripe
        </p>
      </div>

      {/* Pricing Settings Matrix */}
      <div className="space-y-4">
        <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block">
          Commercial Pricing Model
        </label>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {([
            { id: 'free', label: 'Free Access', desc: 'Open entry point. Students bypass checkout gates entirely.' },
            { id: 'one_time', label: 'One-Time Buy', desc: 'Fixed price barrier. Requires single payment success.' },
            { id: 'subscription', label: 'Subscription', desc: 'Recurring cycles. Configuration for monthly/yearly billing.' },
            { id: 'hybrid', label: 'Free Preview', desc: 'Hybrid access. Mask premium lessons behind checkout gate.' }
          ] as const).map((model) => (
            <button
              key={model.id}
              type="button"
              onClick={() => {
                setPricingModel(model.id);
                if (model.id === 'free') setPrice("0.00");
              }}
              className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all min-h-[120px] ${
                pricingModel === model.id
                  ? 'border-primary bg-primary/5 text-white'
                  : 'border-white/5 bg-[#111d47]/20 hover:border-white/10 text-white/70'
              }`}
            >
              <div className="space-y-1">
                <span className={`text-xs font-black uppercase tracking-wider block ${pricingModel === model.id ? 'text-primary' : 'text-white'}`}>
                  {model.label}
                </span>
                <span className="text-[9px] text-white/40 block leading-normal">{model.desc}</span>
              </div>
              {pricingModel === model.id && (
                <div className="w-2.5 h-2.5 bg-primary rounded-full mt-2 self-end" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {/* Price Config */}
        {pricingModel !== 'free' && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block">Price (USD)</label>
            <div className="relative">
              <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={13} />
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#111d47] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-xs text-white outline-none focus:border-primary transition-all font-mono"
                required
              />
            </div>
          </div>
        )}

        {/* Subscription Interval Selector */}
        {pricingModel === 'subscription' && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block">Billing Interval</label>
            <select
              value={subInterval}
              onChange={(e) => setSubInterval(e.target.value as 'month' | 'year')}
              className="w-full bg-[#111d47] border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-primary transition-all"
            >
              <option value="month">Monthly Cycle</option>
              <option value="year">Yearly Cycle</option>
            </select>
          </div>
        )}

        {/* Enrollment Cap Constraint */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block">
            Enrolment Cap Limit
          </label>
          <div className="relative">
            <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={13} />
            <input
              type="number"
              min="1"
              value={enrolmentCap}
              onChange={(e) => setEnrolmentCap(e.target.value)}
              placeholder="No limit (Default)"
              className="w-full bg-[#111d47] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-xs text-white outline-none focus:border-primary transition-all font-mono"
            />
          </div>
        </div>
      </div>

      {/* Stripe Connection Status Panel */}
      <div className="bg-[#111d47]/20 border border-white/5 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="text-primary shrink-0" size={16} />
          <span className="text-[10px] font-black uppercase tracking-wider text-white">Stripe Checkout Routing</span>
        </div>
        
        {checkingGateway ? (
          <div className="flex items-center gap-2 text-[10px] text-white/40 font-mono">
            <Loader2 className="animate-spin text-primary" size={12} /> Syncing gateway integrations status...
          </div>
        ) : gatewayStatus.connected ? (
          <div className="bg-[#0f2d4a]/20 border border-[#0f2d4a] rounded-xl p-4 flex items-start gap-3">
            <ShieldCheck className="text-emerald-400 shrink-0 mt-0.5" size={16} />
            <div className="space-y-1">
              <span className="text-xs font-bold text-white block">Connected to Workspace Stripe Connect Gateway</span>
              <span className="text-[9px] text-white/40 block leading-relaxed">
                Checkouts for this course will be routed directly to your linked Stripe account. Zero marketplace fees will be charged by LeadsMind.
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-4 flex items-start gap-3">
            <Sparkles className="text-yellow-400 shrink-0 mt-0.5" size={16} />
            <div className="space-y-1">
              <span className="text-xs font-bold text-yellow-300 block">System default Stripe credentials active</span>
              <span className="text-[9px] text-white/40 block leading-relaxed">
                You have not connected a custom Stripe account in workspace integrations. Payments will default to system routing. To change this, link Stripe in your workspace settings.
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end border-t border-white/5 pt-4">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-primary hover:bg-primary/95 text-white font-black uppercase tracking-wider text-[10px] h-11 px-6 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-1.5 transition-all"
        >
          {isPending ? (
            <>
              <Loader2 size={13} className="animate-spin" /> Saving Configurations...
            </>
          ) : (
            "Lock pricing matrix"
          )}
        </Button>
      </div>
    </form>
  );
}
