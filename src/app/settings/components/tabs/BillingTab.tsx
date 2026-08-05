"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { Users, Zap, CreditCard, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { pricingTiers } from '@/app/(marketing)/landing/data';
import { createPaystackSubscription, cancelPaystackSubscription } from '@/app/actions/finance';

interface BillingInfo {
  planTier: string;
  stripeSubscriptionId: string | null;
  paystackCustomerCode: string | null;
  paystackSubscriptionCode: string | null;
  nextPaymentDate?: string | null;
  amount?: number | null;
  subscriptionStatus?: string | null;
}

interface BillingTabProps {
  memberCount: number;
  billing: BillingInfo | null;
}

export default function BillingTab({ memberCount, billing }: BillingTabProps) {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const planTier = billing?.planTier || 'spark';
  const currentTier = pricingTiers.find((t) => t.id === planTier) ?? pricingTiers[0];
  const hasActiveSubscription = !!billing?.paystackSubscriptionCode;

  // Everything except Dynasty is self-serve — Dynasty stays "Contact Sales"
  // everywhere in the app (public pricing page and here), matching its
  // enterprise/sales-assisted positioning rather than self-checkout.
  const otherTiers = pricingTiers.filter((t) => t.id !== 'dynasty' && t.id !== planTier);
  const dynastyTier = pricingTiers.find((t) => t.id === 'dynasty');

  async function handleSelectTier(tierId: string) {
    if (tierId === 'spark') {
      // Moving to Spark from a paid plan is a cancellation, not a checkout.
      setConfirmingCancel(true);
      return;
    }
    setLoadingTier(tierId);
    try {
      const result = await createPaystackSubscription(tierId, 'month');
      if (result.error || !result.url) {
        toast.error(result.error || 'Failed to start checkout');
        return;
      }
      window.location.href = result.url;
    } finally {
      setLoadingTier(null);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      const result = await cancelPaystackSubscription();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Subscription cancelled — your workspace is now on the Spark plan.');
      setConfirmingCancel(false);
    } finally {
      setCancelling(false);
    }
  }

  const nextBillingLabel = billing?.nextPaymentDate
    ? new Date(billing.nextPaymentDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;
  const nextBillingAmount = typeof billing?.amount === 'number' ? (billing.amount / 100).toFixed(2) : null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 motion-reduce:animate-none">
      <div className="p-8 bg-gradient-to-br from-dash-accent/10 to-dash-surface border border-dash-accent/20 rounded-3xl relative overflow-hidden group shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-dash-accent/10 rounded-full blur-[80px] -mr-32 -mt-32" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-3">
            <span className="inline-block px-3 py-1 bg-dash-accent text-white font-bold text-[10px] rounded-full shadow-sm uppercase">{currentTier.name} plan</span>
            <h4 className="text-[28px] font-bold !text-dash-text tracking-tight leading-none">
              {currentTier.monthlyPrice > 0 ? `$${currentTier.monthlyPrice}/mo` : 'Free forever'}
            </h4>
            <p className="!text-dash-textMuted text-[12px] font-bold flex items-center gap-2">
              {currentTier.description}
            </p>
            {hasActiveSubscription && nextBillingLabel && (
              <p className="!text-dash-textMuted text-[11px] font-semibold flex items-center gap-1.5">
                <Calendar size={12} />
                Next billing date: {nextBillingLabel}{nextBillingAmount ? ` — $${nextBillingAmount}` : ''}
              </p>
            )}
          </div>
          {hasActiveSubscription ? (
            confirmingCancel ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold !text-dash-textMuted mr-1">
                  Cancels immediately — you'll drop to Spark right away.
                </span>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 font-bold text-[11px] h-11 px-6 rounded-2xl shadow-sm transition-colors flex items-center gap-2"
                >
                  {cancelling && <Loader2 size={14} className="animate-spin" />}
                  Yes, cancel now
                </button>
                <button
                  onClick={() => setConfirmingCancel(false)}
                  disabled={cancelling}
                  className="bg-white text-dash-text font-bold text-[11px] h-11 px-6 rounded-2xl shadow-sm border border-dash-border transition-colors"
                >
                  Keep my plan
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingCancel(true)}
                className="bg-white text-red-600 hover:scale-105 active:scale-95 motion-reduce:hover:scale-100 font-bold text-[11px] h-14 px-10 rounded-2xl shadow-sm border border-dash-border transition-all motion-reduce:transition-none flex items-center gap-2"
              >
                Cancel subscription
              </button>
            )
          ) : (
            <span className="bg-white text-dash-accent font-bold text-[11px] h-14 px-10 rounded-2xl shadow-sm border border-dash-border flex items-center">
              Current plan
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Active Seats', value: `${memberCount}`, icon: <Users size={16} /> },
          { label: 'Plan', value: currentTier.name, icon: <Zap size={16} /> },
          { label: 'Billing', value: hasActiveSubscription ? 'Paystack' : billing?.stripeSubscriptionId ? 'Stripe' : 'None', icon: <CreditCard size={16} /> }
        ].map((item, idx) => (
          <div key={idx} className="p-6 bg-white border border-dash-border rounded-2xl space-y-4 hover:border-dash-accent/30 transition-all motion-reduce:transition-none group">
            <div className="w-10 h-10 rounded-xl bg-dash-surface flex items-center justify-center !text-dash-textMuted group-hover:text-dash-accent group-hover:bg-dash-accent/10 transition-all motion-reduce:transition-none">
              {item.icon}
            </div>
            <div>
              <p className="text-[10px] font-bold !text-dash-textMuted mb-1">{item.label}</p>
              <p className="text-[18px] font-bold !text-dash-text">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h5 className="text-[14px] font-bold !text-dash-text">All plans</h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {otherTiers.map((tier) => {
            const isDowngrade = tier.monthlyPrice < currentTier.monthlyPrice;
            const actionLabel = tier.id === 'spark'
              ? 'Downgrade to Spark'
              : isDowngrade
              ? `Downgrade to ${tier.name}`
              : `Upgrade to ${tier.name}`;
            return (
              <div key={tier.id} className="p-6 bg-white border border-dash-border rounded-2xl space-y-4 hover:border-dash-accent/30 transition-all motion-reduce:transition-none">
                <div>
                  <p className="text-[14px] font-bold !text-dash-text">{tier.name}</p>
                  <p className="text-[12px] !text-dash-textMuted">{tier.description}</p>
                </div>
                <p className="text-[20px] font-bold !text-dash-text">
                  {tier.monthlyPrice > 0 ? <>${tier.monthlyPrice}<span className="text-[11px] font-normal">/mo</span></> : 'Free'}
                </p>
                <button
                  onClick={() => handleSelectTier(tier.id)}
                  disabled={loadingTier === tier.id}
                  className="w-full bg-dash-accent text-white hover:scale-[1.02] active:scale-95 motion-reduce:hover:scale-100 disabled:opacity-60 disabled:hover:scale-100 font-bold text-[11px] h-11 rounded-xl transition-all motion-reduce:transition-none flex items-center justify-center gap-2"
                >
                  {loadingTier === tier.id && <Loader2 size={14} className="animate-spin" />}
                  {actionLabel}
                </button>
              </div>
            );
          })}

          {dynastyTier && (
            <div key={dynastyTier.id} className="p-6 bg-white border border-dash-border rounded-2xl space-y-4">
              <div>
                <p className="text-[14px] font-bold !text-dash-text">{dynastyTier.name}</p>
                <p className="text-[12px] !text-dash-textMuted">{dynastyTier.description}</p>
              </div>
              <p className="text-[20px] font-bold !text-dash-text">Custom</p>
              <Link
                href="/contact"
                className="w-full bg-[#0F172A] text-white hover:scale-[1.02] active:scale-95 motion-reduce:hover:scale-100 font-bold text-[11px] h-11 rounded-xl transition-all motion-reduce:transition-none flex items-center justify-center gap-2"
              >
                {dynastyTier.cta}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
