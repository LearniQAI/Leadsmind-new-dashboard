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
    <form onSubmit={handleSavePricing} className="bg-white border border-dash-border rounded-2xl p-6 space-y-6 shadow-sm">
      <div className="border-b border-dash-border pb-4">
        <h2 className="text-base font-bold !text-dash-text">
          Course Pricing & Commerce Engine
        </h2>
        <p className="text-[10px] !text-dash-textMuted font-bold mt-1">
          Select commercial models, intervals, enrollment constraints, and connect stripe
        </p>
      </div>

      {/* Pricing Settings Matrix */}
      <div className="space-y-4">
        <label className="text-[10px] font-bold !text-dash-textMuted block">
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
              className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all motion-reduce:transition-none min-h-[120px] ${
                pricingModel === model.id
                  ? 'border-primary bg-primary/5 !text-dash-text'
                  : 'border-dash-border bg-dash-surface hover:border-dash-text/20 !text-dash-textMuted'
              }`}
            >
              <div className="space-y-1">
                <span className={`text-xs font-bold block ${pricingModel === model.id ? 'text-primary' : '!text-dash-text'}`}>
                  {model.label}
                </span>
                <span className="text-[9px] !text-dash-textMuted block leading-normal">{model.desc}</span>
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
            <label className="text-[10px] font-bold !text-dash-textMuted block">Price (USD)</label>
            <div className="relative">
              <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 !text-dash-textMuted" size={13} />
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-dash-surface border border-dash-border rounded-xl pl-9 pr-4 py-3 text-xs !text-dash-text outline-none focus:border-primary transition-all motion-reduce:transition-none font-mono"
                required
              />
            </div>
          </div>
        )}

        {/* Subscription Interval Selector */}
        {pricingModel === 'subscription' && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold !text-dash-textMuted block">Billing Interval</label>
            <select
              value={subInterval}
              onChange={(e) => setSubInterval(e.target.value as 'month' | 'year')}
              className="w-full bg-dash-surface border border-dash-border rounded-xl px-4 py-3 text-xs !text-dash-text outline-none focus:border-primary transition-all motion-reduce:transition-none"
            >
              <option value="month">Monthly Cycle</option>
              <option value="year">Yearly Cycle</option>
            </select>
          </div>
        )}

        {/* Enrollment Cap Constraint */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold !text-dash-textMuted block">
            Enrolment Cap Limit
          </label>
          <div className="relative">
            <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 !text-dash-textMuted" size={13} />
            <input
              type="number"
              min="1"
              value={enrolmentCap}
              onChange={(e) => setEnrolmentCap(e.target.value)}
              placeholder="No limit (Default)"
              className="w-full bg-dash-surface border border-dash-border rounded-xl pl-9 pr-4 py-3 text-xs !text-dash-text outline-none focus:border-primary transition-all motion-reduce:transition-none font-mono"
            />
          </div>
        </div>
      </div>

      {/* Stripe Connection Status Panel */}
      <div className="bg-dash-surface border border-dash-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="text-primary shrink-0" size={16} />
          <span className="text-[10px] font-bold !text-dash-text">Stripe Checkout Routing</span>
        </div>

        {checkingGateway ? (
          <div className="flex items-center gap-2 text-[10px] !text-dash-textMuted font-mono">
            <Loader2 className="animate-spin motion-reduce:animate-none text-primary" size={12} /> Syncing gateway integrations status...
          </div>
        ) : gatewayStatus.connected ? (
          <div className="bg-green/5 border border-green/20 rounded-xl p-4 flex items-start gap-3">
            <ShieldCheck className="text-green shrink-0 mt-0.5" size={16} />
            <div className="space-y-1">
              <span className="text-xs font-bold !text-dash-text block">Connected to Workspace Stripe Connect Gateway</span>
              <span className="text-[9px] !text-dash-textMuted block leading-relaxed">
                Checkouts for this course will be routed directly to your linked Stripe account. Zero marketplace fees will be charged by LeadsMind.
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <Sparkles className="text-amber-600 shrink-0 mt-0.5" size={16} />
            <div className="space-y-1">
              <span className="text-xs font-bold text-amber-700 block">System default Stripe credentials active</span>
              <span className="text-[9px] !text-dash-textMuted block leading-relaxed">
                You have not connected a custom Stripe account in workspace integrations. Payments will default to system routing. To change this, link Stripe in your workspace settings.
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end border-t border-dash-border pt-4">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-primary hover:bg-primary/90 text-white font-bold text-[10px] h-11 px-6 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-1.5 transition-all motion-reduce:transition-none"
        >
          {isPending ? (
            <>
              <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> Saving Configurations...
            </>
          ) : (
            "Lock pricing matrix"
          )}
        </Button>
      </div>
    </form>
  );
}
